import { createHash, randomUUID } from "node:crypto";
import { isUuid, secretHmac } from "./crypto";

export class XapiValidationError extends Error {}

export type XapiStatement = Record<string, unknown> & {
  id: string;
  actor: Record<string, unknown>;
  verb: Record<string, unknown>;
  object: Record<string, unknown>;
  timestamp: string;
};

const statementKeys = new Set(["id", "actor", "verb", "object", "result", "context", "timestamp", "stored", "authority", "version", "attachments"]);
const iriPattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/;
const durationPattern = /^P(?=\d|T\d)(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/;

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new XapiValidationError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function iri(value: unknown, field: string) {
  if (typeof value !== "string" || value.length > 2048 || !iriPattern.test(value)) throw new XapiValidationError(`${field} must be an absolute IRI.`);
}

function rejectNulls(value: unknown, insideExtension = false) {
  if (value === null && !insideExtension) throw new XapiValidationError("Statement properties must not contain null values outside extensions.");
  if (Array.isArray(value)) value.forEach((item) => rejectNulls(item, insideExtension));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => rejectNulls(item, insideExtension || key === "extensions"));
}

function validateLanguageMap(value: unknown, field: string) {
  const map = object(value, field);
  for (const [language, text] of Object.entries(map)) {
    try { if (!Intl.getCanonicalLocales(language).length) throw new Error(); }
    catch { throw new XapiValidationError(`${field} contains an invalid language tag.`); }
    if (typeof text !== "string" || !text.length) throw new XapiValidationError(`${field} values must be non-empty strings.`);
  }
}

function validateIdentifier(agent: Record<string, unknown>, field: string) {
  const keys = ["mbox", "mbox_sha1sum", "openid", "account"].filter((key) => agent[key] !== undefined);
  if (keys.length !== 1) throw new XapiValidationError(`${field} must contain exactly one inverse functional identifier.`);
  const key = keys[0];
  if (key === "mbox") {
    if (typeof agent.mbox !== "string" || !/^mailto:[^\s@]+@[^\s@]+$/i.test(agent.mbox)) throw new XapiValidationError(`${field}.mbox must be a mailto IRI.`);
  } else if (key === "mbox_sha1sum") {
    if (typeof agent.mbox_sha1sum !== "string" || !/^[a-f0-9]{40}$/i.test(agent.mbox_sha1sum)) throw new XapiValidationError(`${field}.mbox_sha1sum must be a SHA-1 hex string.`);
  } else if (key === "openid") iri(agent.openid, `${field}.openid`);
  else {
    const account = object(agent.account, `${field}.account`);
    iri(account.homePage, `${field}.account.homePage`);
    if (typeof account.name !== "string" || !account.name.length || account.name.length > 256) throw new XapiValidationError(`${field}.account.name must be a non-empty string.`);
  }
}

function validateAgent(value: unknown, field: string, allowAnonymousGroup = true) {
  const agent = object(value, field);
  const objectType = agent.objectType;
  if (objectType !== undefined && objectType !== "Agent" && objectType !== "Group") throw new XapiValidationError(`${field}.objectType must be Agent or Group.`);
  if (objectType === "Group") {
    const hasIdentifier = ["mbox", "mbox_sha1sum", "openid", "account"].some((key) => agent[key] !== undefined);
    if (!hasIdentifier && !allowAnonymousGroup) throw new XapiValidationError(`${field} must be an identified Group.`);
    if (hasIdentifier) validateIdentifier(agent, field);
    if (agent.member !== undefined) {
      if (!Array.isArray(agent.member)) throw new XapiValidationError(`${field}.member must be an array.`);
      agent.member.forEach((member, index) => {
        const item = object(member, `${field}.member[${index}]`);
        if (item.objectType === "Group") throw new XapiValidationError("Group members cannot be Groups.");
        validateIdentifier(item, `${field}.member[${index}]`);
      });
    } else if (!hasIdentifier) throw new XapiValidationError("Anonymous Groups must include member Agents.");
  } else {
    if (agent.member !== undefined) throw new XapiValidationError(`${field}.member is only valid for Groups.`);
    validateIdentifier(agent, field);
  }
  if (agent.name !== undefined && typeof agent.name !== "string") throw new XapiValidationError(`${field}.name must be a string.`);
  return agent;
}

function validateActivity(value: unknown, field: string) {
  const activity = object(value, field);
  if (activity.objectType !== undefined && activity.objectType !== "Activity") throw new XapiValidationError(`${field}.objectType is invalid.`);
  iri(activity.id, `${field}.id`);
  if (activity.definition !== undefined) {
    const definition = object(activity.definition, `${field}.definition`);
    for (const key of ["name", "description"]) if (definition[key] !== undefined) validateLanguageMap(definition[key], `${field}.definition.${key}`);
    if (definition.type !== undefined) iri(definition.type, `${field}.definition.type`);
    if (definition.moreInfo !== undefined) iri(definition.moreInfo, `${field}.definition.moreInfo`);
    if (definition.extensions !== undefined) {
      const extensions = object(definition.extensions, `${field}.definition.extensions`);
      Object.keys(extensions).forEach((key) => iri(key, `${field}.definition.extensions key`));
    }
  }
  return activity;
}

function validateVerb(value: unknown, field: string) {
  const verb = object(value, field);
  iri(verb.id, `${field}.id`);
  if (verb.display !== undefined) validateLanguageMap(verb.display, `${field}.display`);
  return verb;
}

function validateObject(value: unknown, field: string, depth = 0): Record<string, unknown> {
  if (depth > 8) throw new XapiValidationError("Statement nesting exceeds the supported limit.");
  const target = object(value, field);
  switch (target.objectType) {
    case "Agent":
    case "Group":
      validateAgent(target, field, false);
      break;
    case "StatementRef":
      if (!isUuid(String(target.id ?? ""))) throw new XapiValidationError(`${field}.id must be a UUID.`);
      break;
    case "SubStatement":
      if (target.id !== undefined || target.stored !== undefined || target.authority !== undefined || target.version !== undefined || target.timestamp !== undefined || target.attachments !== undefined) throw new XapiValidationError("SubStatements cannot contain id, stored, authority, version, timestamp, or attachments.");
      validateStatementObject(target, field, depth + 1, false);
      break;
    case undefined:
    case "Activity":
      validateActivity(target, field);
      break;
    default:
      throw new XapiValidationError(`${field}.objectType is not supported.`);
  }
  return target;
}

function validateContext(contextValue: unknown) {
  const context = object(contextValue, "context");
  if (context.registration !== undefined && !isUuid(String(context.registration))) throw new XapiValidationError("context.registration must be a UUID.");
  if (context.instructor !== undefined) validateAgent(context.instructor, "context.instructor", false);
  if (context.team !== undefined) {
    const team = object(context.team, "context.team");
    if (team.objectType !== "Group") throw new XapiValidationError("context.team must be a Group.");
    validateAgent(team, "context.team");
  }
  if (context.platform !== undefined && typeof context.platform !== "string") throw new XapiValidationError("context.platform must be a string.");
  if (context.language !== undefined) {
    try { if (typeof context.language !== "string" || !Intl.getCanonicalLocales(context.language).length) throw new Error(); }
    catch { throw new XapiValidationError("context.language must be a valid language tag."); }
  }
  if (context.contextActivities !== undefined) {
    const activities = object(context.contextActivities, "context.contextActivities");
    for (const key of ["parent", "grouping", "category", "other"]) {
      if (activities[key] === undefined) continue;
      const values = Array.isArray(activities[key]) ? activities[key] as unknown[] : [activities[key]];
      values.forEach((activity, index) => validateActivity(activity, `context.contextActivities.${key}[${index}]`));
    }
  }
  if (context.extensions !== undefined) {
    const extensions = object(context.extensions, "context.extensions");
    Object.keys(extensions).forEach((key) => iri(key, "context.extensions key"));
  }
}

function validateResult(resultValue: unknown) {
  const result = object(resultValue, "result");
  if (result.score !== undefined) {
    const score = object(result.score, "result.score");
    for (const key of ["scaled", "raw", "min", "max"]) if (score[key] !== undefined && typeof score[key] !== "number") throw new XapiValidationError(`result.score.${key} must be a number.`);
    if (typeof score.scaled === "number" && (score.scaled < -1 || score.scaled > 1)) throw new XapiValidationError("result.score.scaled must be between -1 and 1.");
  }
  for (const key of ["success", "completion"]) if (result[key] !== undefined && typeof result[key] !== "boolean") throw new XapiValidationError(`result.${key} must be a boolean.`);
  for (const key of ["response", "duration"]) if (result[key] !== undefined && typeof result[key] !== "string") throw new XapiValidationError(`result.${key} must be a string.`);
  if (typeof result.duration === "string" && !durationPattern.test(result.duration)) throw new XapiValidationError("result.duration must be an ISO 8601 duration.");
  if (result.extensions !== undefined) {
    const extensions = object(result.extensions, "result.extensions");
    Object.keys(extensions).forEach((key) => iri(key, "result.extensions key"));
  }
}

function validateStatementObject(statement: Record<string, unknown>, field = "statement", depth = 0, topLevel = true) {
  if (topLevel) {
    for (const key of Object.keys(statement)) if (!statementKeys.has(key)) throw new XapiValidationError(`Unsupported statement property: ${key}.`);
    if (statement.id !== undefined && !isUuid(String(statement.id))) throw new XapiValidationError("Statement id must be a UUID.");
  } else {
    const subStatementKeys = new Set(["actor", "verb", "object", "result", "context"]);
    for (const key of Object.keys(statement)) if (!subStatementKeys.has(key)) throw new XapiValidationError(`Unsupported SubStatement property: ${key}.`);
  }
  validateAgent(statement.actor, `${field}.actor`);
  validateVerb(statement.verb, `${field}.verb`);
  validateObject(statement.object, `${field}.object`, depth);
  if (statement.result !== undefined) validateResult(statement.result);
  if (statement.context !== undefined) validateContext(statement.context);
  if (statement.timestamp !== undefined && (typeof statement.timestamp !== "string" || !Number.isFinite(Date.parse(statement.timestamp)) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/i.test(statement.timestamp))) throw new XapiValidationError("Statement timestamp must be an ISO 8601 date-time with a timezone.");
  if (statement.version !== undefined && (typeof statement.version !== "string" || !/^1\.0\.[0-3]$/.test(statement.version))) throw new XapiValidationError("Statement version must be a supported xAPI 1.0.x version.");
  if (statement.authority !== undefined) validateAgent(statement.authority, `${field}.authority`, false);
  if (statement.attachments !== undefined) {
    if (!Array.isArray(statement.attachments)) throw new XapiValidationError("Statement attachments must be an array.");
    for (const [index, item] of statement.attachments.entries()) {
      const attachment = object(item, `${field}.attachments[${index}]`);
      iri(attachment.usageType, `${field}.attachments[${index}].usageType`);
      if (typeof attachment.contentType !== "string" || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+/i.test(attachment.contentType)) throw new XapiValidationError("Attachment contentType must be a MIME type.");
      if (typeof attachment.length !== "number" || !Number.isInteger(attachment.length) || attachment.length < 0) throw new XapiValidationError("Attachment length must be a non-negative integer.");
      if (typeof attachment.sha2 !== "string" || !/^(?:[a-f0-9]{64}|[a-f0-9]{96}|[a-f0-9]{128})$/i.test(attachment.sha2)) throw new XapiValidationError("Attachment sha2 must be a SHA-2 hex digest.");
      if (attachment.display !== undefined) validateLanguageMap(attachment.display, "attachment.display");
      else throw new XapiValidationError("Attachment display is required.");
      if (attachment.description !== undefined) validateLanguageMap(attachment.description, "attachment.description");
      if (attachment.fileUrl !== undefined) iri(attachment.fileUrl, "attachment.fileUrl");
    }
  }
  rejectNulls(statement);
}

export function validateStatement(value: unknown) {
  const statement = object(value, "statement");
  validateStatementObject(statement);
  return statement;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

type ActorIdentifier = { mbox: string } | { mbox_sha1sum: string } | { openid: string } | { account: unknown } | { member: ActorIdentifier[] };

function actorIdentifier(actor: Record<string, unknown>): ActorIdentifier {
  const value = actor as Record<string, unknown>;
  if (value.mbox) {
    const address = String(value.mbox).slice("mailto:".length);
    const separator = address.lastIndexOf("@");
    return { mbox: `mailto:${address.slice(0, separator)}@${address.slice(separator + 1).toLowerCase()}` };
  }
  if (value.mbox_sha1sum) return { mbox_sha1sum: String(value.mbox_sha1sum).toLowerCase() };
  if (value.openid) return { openid: String(value.openid) };
  if (value.account) return { account: value.account };
  if (Array.isArray(value.member)) return { member: value.member.map((member) => actorIdentifier(member as Record<string, unknown>)).sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))) };
  throw new XapiValidationError("Actor has no stable identity.");
}

export function actorHash(actorValue: unknown) {
  const actor = object(actorValue, "actor");
  return secretHmac(canonicalJson({ objectType: actor.objectType ?? "Agent", identifier: actorIdentifier(actor) }));
}

function addAgentAndMembers(value: unknown, hashes: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const agent = value as Record<string, unknown>;
  try { hashes.add(actorHash(agent)); } catch { return; }
  if (Array.isArray(agent.member)) agent.member.forEach((member) => addAgentAndMembers(member, hashes));
}

export function directAgentHashes(statement: Record<string, unknown>) {
  const hashes = new Set<string>();
  const visit = (item: Record<string, unknown>) => {
    addAgentAndMembers(item.actor, hashes);
    const target = item.object as Record<string, unknown> | undefined;
    if (target && (target.objectType === "Agent" || target.objectType === "Group")) addAgentAndMembers(target, hashes);
    if (target?.objectType === "SubStatement") visit(target);
  };
  visit(statement);
  return [...hashes];
}

export function relatedAgentHashes(statement: Record<string, unknown>) {
  const hashes = new Set(directAgentHashes(statement));
  const visit = (item: Record<string, unknown>) => {
    addAgentAndMembers(item.authority, hashes);
    const context = item.context as Record<string, unknown> | undefined;
    if (context) { addAgentAndMembers(context.instructor, hashes); addAgentAndMembers(context.team, hashes); }
    const target = item.object as Record<string, unknown> | undefined;
    if (target?.objectType === "SubStatement") visit(target);
  };
  visit(statement);
  return [...hashes];
}

export function relatedActivityIds(statement: Record<string, unknown>) {
  const ids = new Set<string>();
  const addActivity = (item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const activity = item as Record<string, unknown>;
    if ((activity.objectType === undefined || activity.objectType === "Activity") && typeof activity.id === "string") ids.add(activity.id);
  };
  const visit = (item: Record<string, unknown>) => {
    addActivity(item.object);
    const context = item.context as Record<string, unknown> | undefined;
    const activities = context?.contextActivities as Record<string, unknown> | undefined;
    if (activities) Object.values(activities).forEach((values) => (Array.isArray(values) ? values : [values]).forEach(addActivity));
    const target = item.object as Record<string, unknown> | undefined;
    if (target?.objectType === "SubStatement") visit(target);
  };
  visit(statement);
  return [...ids];
}

export function prepareStatement(raw: unknown, options: { registrationId: string; registrationName: string; sourceIdentifier?: string; baseUrl: string; existingTimestampAssigned?: boolean }) {
  const input = validateStatement(raw);
  const now = new Date().toISOString();
  const timestampWasAssigned = options.existingTimestampAssigned ?? input.timestamp === undefined;
  const id = typeof input.id === "string" ? input.id : randomUUID();
  const timestamp = typeof input.timestamp === "string" ? input.timestamp : now;
  const actor = input.actor as Record<string, unknown>;
  const verb = input.verb as Record<string, unknown>;
  const target = input.object as Record<string, unknown>;
  const context = input.context as Record<string, unknown> | undefined;
  const registrationUuid = typeof context?.registration === "string" ? context.registration : "";
  const providerAuthority = {
    objectType: "Agent",
    account: { homePage: options.baseUrl, name: options.sourceIdentifier ?? `lrs-registration:${options.registrationId}` },
    name: options.registrationName,
  };
  const comparable = { ...input };
  delete comparable.id;
  delete comparable.authority;
  delete comparable.stored;
  if (timestampWasAssigned) delete comparable.timestamp;
  const comparisonHash = createHash("sha256").update(canonicalJson(comparable)).digest("hex");
  const returned: Record<string, unknown> = { ...input, id, actor, verb, object: target, timestamp, stored: now, authority: providerAuthority };
  const objectType = target.objectType;
  const objectHash = objectType === "Agent" || objectType === "Group" ? actorHash(target) : null;
  return {
    statementId: id,
    actorHash: actorHash(actor),
    actorJson: actor,
    objectHash,
    directAgentHashes: directAgentHashes(input),
    objectId: typeof target.id === "string" ? target.id : "",
    verbId: String(verb.id),
    registrationUuid,
    storedAt: now,
    statementTimestamp: timestamp,
    statementVersion: typeof input.version === "string" ? input.version : "1.0.0",
    timestampWasAssigned,
    statementHash: comparisonHash,
    statementJson: returned,
    relatedAgentHashes: relatedAgentHashes(returned),
    relatedActivityIds: relatedActivityIds(input),
    isVoid: verb.id === "http://adlnet.gov/expapi/verbs/voided",
    voidTargetId: objectType === "StatementRef" && typeof target.id === "string" ? target.id : null,
  };
}

export function parseAgentParameter(value: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new XapiValidationError("agent must be valid JSON."); }
  const agent = validateAgent(parsed, "agent", false);
  return { agent, hash: actorHash(agent) };
}

export function parseIsoDate(value: string, name: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/i.test(value)) throw new XapiValidationError(`${name} must be an ISO 8601 date-time with a timezone.`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new XapiValidationError(`${name} must be an ISO 8601 timestamp.`);
  return date.toISOString();
}
