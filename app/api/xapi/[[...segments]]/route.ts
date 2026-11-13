import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { actorHash, canonicalJson, directAgentHashes, parseAgentParameter, parseIsoDate, prepareStatement, relatedAgentHashes, relatedActivityIds, validateStatement, XapiValidationError } from "@/lib/xapi/validation";
import { authenticateXapi, corsHeaders, emptyResponse, errorResponse, jsonResponse, preflightXapi, serviceClient, type LrsPrincipal } from "@/lib/xapi/server";
import { etagMatches } from "@/lib/xapi/etag";

type Context = { params: Promise<{ segments?: string[] }> };
type StoredStatementRow = {
  statement_id: string;
  actor_hash: string;
  actor_json: Record<string, unknown>;
  object_hash: string | null;
  direct_agent_hashes: string[];
  related_agent_hashes: string[];
  related_activity_ids: string[];
  verb_id: string;
  object_id: string;
  registration_uuid: string;
  statement_timestamp: string;
  stored_at: string;
  statement_version: string;
  lrs_timestamp_assigned: boolean;
  statement_hash: string;
  statement_json: Record<string, unknown>;
};

type FilterSet = {
  agentHash: string | null;
  verbId: string | null;
  activityId: string | null;
  registrationUuid: string | null;
  since: string | null;
  until: string | null;
  relatedAgents: boolean;
  relatedActivities: boolean;
  ascending: boolean;
  limit: number;
  format: "ids" | "exact" | "canonical";
  attachments: boolean;
  offset: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statementsPath = "statements";
const allowedScopes: Record<string, string> = {
  statements: "statements.read",
  agents: "agents.read",
  activities: "activities.read",
  "activities/state": "documents.read",
  "activities/profile": "documents.read",
  "agents/profile": "documents.read",
};

function makeScope(path: string, method: string) {
  if (path === "statements" && ["POST", "PUT"].includes(method)) return "statements.write";
  if (path === "activities/state" && ["POST", "PUT", "DELETE"].includes(method)) return "documents.write";
  if ((path === "agents/profile" || path === "activities/profile") && ["POST", "PUT", "DELETE"].includes(method)) return "documents.write";
  return allowedScopes[path];
}

function safeBoolean(value: string | null, field: string, defaultValue: boolean) {
  if (value === null) return defaultValue;
  if (value !== "true" && value !== "false") throw new XapiValidationError(`${field} must be true or false.`);
  return value === "true";
}

function parseFilters(url: URL, offset = 0): FilterSet {
  const accepted = new Set(["statementId", "voidedStatementId", "agent", "verb", "activity", "registration", "related_agents", "related_activities", "since", "until", "limit", "ascending", "format", "attachments", "continuation"]);
  for (const key of url.searchParams.keys()) if (!accepted.has(key)) throw new XapiValidationError(`Unsupported query parameter: ${key}.`);
  if (url.searchParams.has("statementId") || url.searchParams.has("voidedStatementId")) throw new XapiValidationError("Single-statement lookup must be handled separately.");
  const agentParam = url.searchParams.get("agent");
  const agentHash = agentParam ? parseAgentParameter(agentParam).hash : null;
  const verbId = url.searchParams.get("verb");
  if (verbId && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(verbId)) throw new XapiValidationError("verb must be an absolute IRI.");
  const activityId = url.searchParams.get("activity");
  if (activityId && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(activityId)) throw new XapiValidationError("activity must be an absolute IRI.");
  const registrationUuid = url.searchParams.get("registration");
  if (registrationUuid && !uuidPattern.test(registrationUuid)) throw new XapiValidationError("registration must be a UUID.");
  const rawLimit = url.searchParams.get("limit");
  const requestedLimit = rawLimit === null || rawLimit === "0" ? 1000 : Number(rawLimit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 0 || requestedLimit > 1000) throw new XapiValidationError("limit must be an integer between 0 and 1000.");
  const format = url.searchParams.get("format") ?? "exact";
  if (format !== "ids" && format !== "exact" && format !== "canonical") throw new XapiValidationError("format must be ids, exact, or canonical.");
  const attachments = safeBoolean(url.searchParams.get("attachments"), "attachments", false);
  return {
    agentHash,
    verbId,
    activityId,
    registrationUuid,
    since: url.searchParams.has("since") ? parseIsoDate(url.searchParams.get("since")!, "since") : null,
    until: url.searchParams.has("until") ? parseIsoDate(url.searchParams.get("until")!, "until") : null,
    relatedAgents: safeBoolean(url.searchParams.get("related_agents"), "related_agents", false),
    relatedActivities: safeBoolean(url.searchParams.get("related_activities"), "related_activities", false),
    ascending: safeBoolean(url.searchParams.get("ascending"), "ascending", false),
    limit: requestedLimit || 1000,
    format,
    attachments,
    offset,
  };
}

function continuationToken(payload: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.SUPABASE_JWT_SECRET!).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readContinuation(token: string, registrationId: string) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new XapiValidationError("Invalid continuation token.");
  const expected = createHmac("sha256", process.env.SUPABASE_JWT_SECRET!).update(encoded).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new XapiValidationError("Invalid continuation token.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { registrationId: string; offset: number; expiresAt: number; filters: Omit<FilterSet, "offset"> };
  if (payload.registrationId !== registrationId || payload.expiresAt < Date.now() || !Number.isInteger(payload.offset) || payload.offset < 0) throw new XapiValidationError("Expired or invalid continuation token.");
  return { filters: payload.filters, offset: payload.offset };
}

function minimalAgent(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const actor = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  if (actor.objectType === "Group") result.objectType = "Group";
  for (const key of ["mbox", "mbox_sha1sum", "openid", "account"]) if (actor[key] !== undefined) result[key] = actor[key];
  if (Array.isArray(actor.member)) result.member = actor.member.map(minimalAgent);
  return result;
}

function minimalObject(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const objectValue = value as Record<string, unknown>;
  if (objectValue.objectType === "StatementRef") return { objectType: "StatementRef", id: objectValue.id };
  if (objectValue.objectType === "Agent" || objectValue.objectType === "Group") return minimalAgent(objectValue);
  if (objectValue.objectType === "SubStatement") return { ...objectValue, actor: minimalAgent(objectValue.actor), verb: { id: (objectValue.verb as Record<string, unknown>).id }, object: minimalObject(objectValue.object) };
  return { id: objectValue.id };
}

function idsFormat(statement: Record<string, unknown>) {
  return { ...statement, actor: minimalAgent(statement.actor), verb: { id: (statement.verb as Record<string, unknown>).id }, object: minimalObject(statement.object) };
}

function urlForStatementContinuation(request: Request, token: string) {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname}?continuation=${encodeURIComponent(token)}`;
}

function singleStatementQueryError(params: URLSearchParams) {
  const hasStatement = params.has("statementId");
  const hasVoided = params.has("voidedStatementId");
  if (hasStatement && hasVoided) return "statementId and voidedStatementId cannot both be specified.";
  if (!hasStatement && !hasVoided) return null;
  const allowed = new Set([hasStatement ? "statementId" : "voidedStatementId", "attachments", "format"]);
  for (const key of params.keys()) if (!allowed.has(key)) return "Single-statement lookup cannot be combined with other filters.";
  return null;
}

async function getStatements(request: Request, principal: LrsPrincipal, cors: Headers) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const singleError = singleStatementQueryError(params);
  if (singleError) return errorResponse(singleError, 400, cors);
  const attachments = safeBoolean(params.get("attachments"), "attachments", false);
  if (attachments) return errorResponse("Binary attachment retrieval is not implemented. JSON statements with fileUrl are supported.", 501, cors);

  const singleId = params.get("statementId") ?? params.get("voidedStatementId");
  if (singleId) {
    if (!uuidPattern.test(singleId)) return errorResponse("Statement identifiers must be UUIDs.", 400, cors);
    const { data, error } = await serviceClient().from("lrs_statements").select("statement_id,statement_json,stored_at,is_voided,registration_id")
      .eq("statement_id", singleId).eq("registration_id", principal.registration.id).maybeSingle();
    if (error) return errorResponse("Statement query failed.", 500, cors);
    if (!data || (params.has("voidedStatementId") ? !data.is_voided : data.is_voided)) return errorResponse("Statement not found.", 404, cors);
    const format = params.get("format") ?? "exact";
    if (format !== "exact" && format !== "ids" && format !== "canonical") return errorResponse("Invalid statement format.", 400, cors);
    if (format === "canonical") return errorResponse("Canonical format expansion is not implemented.", 501, cors);
    const statement = format === "ids" ? idsFormat(data.statement_json as Record<string, unknown>) : data.statement_json;
    const headers = new Headers(cors);
    headers.set("Last-Modified", new Date(data.stored_at).toUTCString());
    return jsonResponse(statement, 200, headers);
  }

  let filters: FilterSet;
  let offset = 0;
  const token = params.get("continuation");
  if (token) {
    if ([...params.keys()].some((key) => key !== "continuation")) return errorResponse("Continuation cannot be combined with other filters.", 400, cors);
    try {
      const parsed = readContinuation(token, principal.registration.id);
      filters = { ...parsed.filters, offset: parsed.offset } as FilterSet;
      offset = parsed.offset;
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid continuation token.", 400, cors);
    }
  } else {
    try { filters = parseFilters(url); }
    catch (error) { return errorResponse(error instanceof Error ? error.message : "Invalid query parameters.", 400, cors); }
  }
  if (filters.attachments) return errorResponse("Binary attachment retrieval is not implemented. JSON statements with fileUrl are supported.", 501, cors);
  if (filters.format === "canonical") return errorResponse("Canonical format expansion is not implemented.", 501, cors);
  const { data, error } = await serviceClient().rpc("query_lrs_statement_page", {
    p_registration_id: principal.registration.id,
    p_actor_hash: filters.agentHash,
    p_verb_id: filters.verbId,
    p_activity_id: filters.activityId,
    p_registration_uuid: filters.registrationUuid,
    p_since: filters.since,
    p_until: filters.until,
    p_related_agents: filters.relatedAgents,
    p_related_activities: filters.relatedActivities,
    p_ascending: filters.ascending,
    p_offset: offset,
    p_limit: filters.limit,
  });
  if (error) return errorResponse("Statement query failed.", 500, cors);
  const rows = (data ?? []) as Array<{ statement_id: string; statement_json: Record<string, unknown>; stored_at: string; total_count: number }>;
  const statements = rows.map((row) => filters.format === "ids" ? idsFormat(row.statement_json) : row.statement_json);
  const totalCount = Number(rows[0]?.total_count ?? 0);
  let more = "";
  if (offset + rows.length < totalCount) {
    const payload = {
      registrationId: principal.registration.id,
      offset: offset + rows.length,
      expiresAt: Date.now() + 60 * 60_000,
      filters: { ...filters, offset: undefined },
    };
    more = urlForStatementContinuation(request, continuationToken(payload));
  }
  return jsonResponse({ statements, more }, 200, cors);
}

function expectedAuthority(principal: LrsPrincipal, request: Request) {
  return {
    objectType: "Agent",
    account: { homePage: new URL(request.url).origin, name: principal.registration.source_identifier },
    name: principal.registration.name,
  };
}

async function readJsonBody(request: Request, maxBytes = 1_048_576) {
  const headerLength = Number(request.headers.get("content-length") ?? 0);
  if (headerLength > maxBytes) return { body: null, error: errorResponse("Request body is too large.", 413) };
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) return { body: null, error: errorResponse("Request body is too large.", 413) };
  try { return { body: JSON.parse(text) as unknown, error: null }; }
  catch { return { body: null, error: errorResponse("Malformed JSON.", 400) }; }
}

async function storeStatements(request: Request, principal: LrsPrincipal, cors: Headers, putId?: string, registrationOverride?: string) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType === "multipart/mixed") return errorResponse("Multipart statement attachments are not implemented.", 501, cors);
  if (contentType !== "application/json") return errorResponse("Content-Type must be application/json.", 400, cors);
  const parsed = await readJsonBody(request);
  if (parsed.error) return errorResponse(await parsed.error.text(), parsed.error.status, cors);
  const rawStatements = Array.isArray(parsed.body) ? parsed.body : [parsed.body];
  if (rawStatements.length < 1 || rawStatements.length > 100) return errorResponse("A request must contain between 1 and 100 statements.", 400, cors);
  if (putId && rawStatements.length !== 1) return errorResponse("PUT accepts exactly one statement.", 400, cors);

  const entries: Array<{ raw: Record<string, unknown>; id: string }> = [];
  try {
    for (const raw of rawStatements) {
      const statement = validateStatement(raw);
      if (registrationOverride) {
        const context = statement.context && typeof statement.context === "object" ? statement.context as Record<string, unknown> : {};
        if (context.registration !== undefined && context.registration !== registrationOverride) return errorResponse("registration query does not match context.registration.", 400, cors);
        statement.context = { ...context, registration: registrationOverride };
        validateStatement(statement);
      }
      const id = putId ?? (typeof statement.id === "string" ? statement.id : randomUUID());
      if (statement.id !== undefined && statement.id !== id) return errorResponse("Statement id does not match statementId.", 400, cors);
      if (putId && statement.id === undefined) statement.id = putId;
      if (statement.id === undefined) statement.id = id;
      if (Array.isArray(statement.attachments) && statement.attachments.some((attachment) => !(attachment as Record<string, unknown>).fileUrl)) {
        return errorResponse("Binary attachment payloads are not implemented; each attachment must provide fileUrl.", 501, cors);
      }
      if ((statement.verb as Record<string, unknown>).id === "http://adlnet.gov/expapi/verbs/voided" && !principal.credential.scopes.includes("statements.void")) {
        return errorResponse("This credential is not permitted to void statements.", 403, cors);
      }
      entries.push({ raw: statement, id });
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid xAPI statement.", 400, cors);
  }
  const uniqueIds = new Set(entries.map((entry) => entry.id));
  if (uniqueIds.size !== entries.length) return errorResponse("A batch cannot contain duplicate statement IDs.", 400, cors);
  const voidEntries = entries.filter((entry) => (entry.raw.verb as Record<string, unknown>).id === "http://adlnet.gov/expapi/verbs/voided");
  const voidTargets = voidEntries.map((entry) => ({ statementId: entry.id, targetId: String((entry.raw.object as Record<string, unknown>).id) }));
  const targetIds = voidTargets.map((entry) => entry.targetId);
  if (targetIds.some((targetId, index) => targetId === voidTargets[index].statementId) || new Set(targetIds).size !== targetIds.length) return errorResponse("A voiding statement cannot void itself or duplicate another void target.", 400, cors);
  const batchById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const { statementId, targetId } of voidTargets) {
    const inBatch = batchById.get(targetId);
    if (inBatch && (inBatch.raw.verb as Record<string, unknown>).id === "http://adlnet.gov/expapi/verbs/voided") return errorResponse("Voiding statements cannot themselves be voided.", 400, cors);
  }

  const svc = serviceClient();
  if (targetIds.length) {
    const { data: existingTargets, error: targetError } = await svc.from("lrs_statements").select("statement_id,registration_id,verb_id,is_voided").in("statement_id", targetIds);
    if (targetError) return errorResponse("Could not verify void targets.", 503, cors);
    if ((existingTargets ?? []).some((target) => target.registration_id !== principal.registration.id || target.verb_id === "http://adlnet.gov/expapi/verbs/voided" || target.is_voided)) return errorResponse("Void target is not permitted or already voided.", 403, cors);
  }
  const { data: existingRows, error: existingError } = await svc.from("lrs_statements").select("statement_id,lrs_timestamp_assigned,registration_id").in("statement_id", entries.map((entry) => entry.id));
  if (existingError) return errorResponse("Statement storage is unavailable.", 503, cors);
  if ((existingRows ?? []).some((row) => row.registration_id !== principal.registration.id)) return errorResponse("Statement identifier is already in use.", 409, cors);
  const existingTimestamp = new Map((existingRows ?? []).map((row) => [row.statement_id, row.lrs_timestamp_assigned]));
  const storedAt = new Date().toISOString();
  const rows: StoredStatementRow[] = [];
  try {
    for (const entry of entries) {
      const prepared = prepareStatement(entry.raw, {
        registrationId: principal.registration.id,
        registrationName: principal.registration.name,
        sourceIdentifier: principal.registration.source_identifier,
        baseUrl: new URL(request.url).origin,
        existingTimestampAssigned: existingTimestamp.get(entry.id),
      });
      const statementJson = { ...prepared.statementJson, authority: expectedAuthority(principal, request) };
      rows.push({
        statement_id: prepared.statementId,
        actor_hash: prepared.actorHash,
        actor_json: prepared.actorJson,
        object_hash: prepared.objectHash,
        direct_agent_hashes: prepared.directAgentHashes,
        related_agent_hashes: prepared.relatedAgentHashes,
        related_activity_ids: prepared.relatedActivityIds,
        verb_id: prepared.verbId,
        object_id: prepared.objectId,
        registration_uuid: prepared.registrationUuid,
        statement_timestamp: prepared.statementTimestamp,
        stored_at: storedAt,
        statement_version: prepared.statementVersion,
        lrs_timestamp_assigned: prepared.timestampWasAssigned,
        statement_hash: prepared.statementHash,
        statement_json: statementJson,
      });
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid xAPI statement.", 400, cors);
  }
  const { data: ids, error } = await svc.rpc("store_lrs_statement_batch", { p_registration_id: principal.registration.id, p_rows: rows });
  if (error) {
    if (error.code === "23505" || error.code === "42501") return errorResponse("Statement conflict or insufficient permission.", error.code === "23505" ? 409 : 403, cors);
    if (error.code === "22023") return errorResponse("Invalid statement batch.", 400, cors);
    return errorResponse("Statement storage failed.", 500, cors);
  }
  for (const { statementId, targetId } of voidTargets) {
    await svc.from("lrs_statements").update({ is_voided: true, voided_by_statement_id: statementId }).eq("statement_id", targetId).eq("registration_id", principal.registration.id).eq("is_voided", false);
    await svc.from("learning_evidence").update({ verification_status: "voided" }).eq("statement_id", targetId);
  }
  const linkExtension = `${new URL(request.url).origin}/api/xapi/extensions/actor-link-challenge`;
  const linkActors = new Set<string>();
  let linkFailures = 0;
  for (const row of rows) {
    const context = row.statement_json.context as Record<string, unknown> | undefined;
    const extensions = context?.extensions as Record<string, unknown> | undefined;
    const challenge = extensions?.[linkExtension];
    if (typeof challenge !== "string" || challenge.length < 40 || challenge.length > 80) continue;
    const { data: linked, error: linkError } = await svc.rpc("confirm_lrs_actor_link", {
      p_registration_id: principal.registration.id,
      p_code_hash: createHash("sha256").update(challenge).digest("hex"),
      p_actor_hash: row.actor_hash,
      p_actor_json: row.actor_json,
    });
    if (linkError) linkFailures += 1;
    else if (linked === true) linkActors.add(row.actor_hash);
  }
  const actorHashes = [...new Set(rows.map((row) => row.actor_hash))];
  const { data: unmatchedRows } = actorHashes.length ? await svc.from("lrs_unmatched_statements").select("statement_id").eq("registration_id", principal.registration.id).eq("review_status", "unmatched").in("actor_hash", actorHashes).limit(1000) : { data: [] };
  const aggregateIds = [...new Set([...(ids ?? []), ...(unmatchedRows ?? []).map((row) => row.statement_id)])];
  const aggregateResults = await Promise.all(aggregateIds.map((statementId: string) => svc.rpc("aggregate_lrs_statement", { p_statement_id: statementId })));
  const aggregateFailures = aggregateResults.filter((result) => result.error);
  await Promise.all([
    svc.from("lrs_audit_logs").insert({
      registration_id: principal.registration.id,
      action: "statements.accepted",
      resource_type: "statement_batch",
      resource_id: null,
      metadata: { received: rows.length, statement_ids: ids, verified_actor_links: linkActors.size },
    }),
    svc.from("lrs_sync_logs").insert({
      registration_id: principal.registration.id,
      sync_type: "xapi_push",
      status: aggregateFailures.length || linkFailures ? "partial" : "completed",
      records_received: rows.length,
      records_accepted: (ids ?? []).length,
      records_rejected: 0,
      error_summary: aggregateFailures.length || linkFailures ? "Statement storage succeeded; actor linking or progress aggregation may need a retry." : null,
      completed_at: new Date().toISOString(),
    }),
  ]);
  if (putId) return emptyResponse(204, cors);
  return jsonResponse(ids, 200, cors);
}

async function getAgents(request: Request, principal: LrsPrincipal, cors: Headers) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "agent")) return errorResponse("Only the agent parameter is supported.", 400, cors);
  const raw = params.get("agent");
  if (!raw) return errorResponse("agent is required.", 400, cors);
  try {
    const parsed = parseAgentParameter(raw);
    if (parsed.agent.objectType === "Group") return errorResponse("The agents resource requires an Agent, not a Group.", 400, cors);
    const { data } = await serviceClient().from("lrs_statements").select("actor_hash,object_hash,actor_json,statement_json")
      .eq("registration_id", principal.registration.id).or(`actor_hash.eq.${parsed.hash},object_hash.eq.${parsed.hash}`)
      .order("stored_at", { ascending: false }).limit(1).maybeSingle();
    const fromObject = data?.object_hash === parsed.hash ? data.statement_json?.object : null;
    const agent = (data?.actor_hash === parsed.hash ? data.actor_json : fromObject ?? parsed.agent) as Record<string, unknown>;
    const person: Record<string, unknown> = { objectType: "Person" };
    for (const key of ["name", "mbox", "mbox_sha1sum", "openid", "account"]) {
      const value = agent[key];
      if (value !== undefined) person[key] = Array.isArray(value) ? value : [value];
    }
    return jsonResponse(person, 200, cors);
  } catch (error) { return errorResponse(error instanceof Error ? error.message : "Invalid agent.", 400, cors); }
}

async function getActivities(request: Request, principal: LrsPrincipal, cors: Headers) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "activityId")) return errorResponse("Only the activityId parameter is supported.", 400, cors);
  const activityId = params.get("activityId");
  if (!activityId || !/^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(activityId)) return errorResponse("activityId must be an absolute IRI.", 400, cors);
  const { data } = await serviceClient().from("lrs_statements").select("statement_json")
    .eq("registration_id", principal.registration.id).eq("object_id", activityId).order("stored_at", { ascending: false }).limit(1).maybeSingle();
  const object = data?.statement_json?.object as Record<string, unknown> | undefined;
  return jsonResponse(object?.objectType === undefined || object?.objectType === "Activity" ? object ?? { id: activityId, objectType: "Activity" } : { id: activityId, objectType: "Activity" }, 200, cors);
}

async function getDocumentResource(path: string, request: Request, principal: LrsPrincipal, cors: Headers) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const allowed = path === "activities/state" ? new Set(["activityId", "agent", "registration", "stateId", "since"]) : path === "agents/profile" ? new Set(["agent", "profileId", "since"]) : new Set(["activityId", "profileId", "since"]);
  for (const key of params.keys()) if (!allowed.has(key)) return errorResponse(`Unsupported query parameter: ${key}.`, 400, cors);
  let agent: Record<string, unknown> | null = null;
  let agentFingerprint = "";
  if (path !== "activities/profile") {
    const rawAgent = params.get("agent");
    if (!rawAgent) return errorResponse("agent is required.", 400, cors);
    try { const parsed = parseAgentParameter(rawAgent); agent = parsed.agent; agentFingerprint = parsed.hash; }
    catch (error) { return errorResponse(error instanceof Error ? error.message : "Invalid agent.", 400, cors); }
  }
  const activityId = params.get("activityId");
  if (path !== "agents/profile" && (!activityId || !/^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(activityId))) return errorResponse("activityId must be an absolute IRI.", 400, cors);
  if (path === "agents/profile" && (agent as Record<string, unknown>).objectType === "Group") return errorResponse("Agent profile resources do not accept Groups.", 400, cors);
  const registration = path === "activities/state" ? params.get("registration") ?? "00000000-0000-0000-0000-000000000000" : null;
  if (registration && !uuidPattern.test(registration)) return errorResponse("registration must be a UUID.", 400, cors);
  const docId = path === "activities/state" ? params.get("stateId") : params.get("profileId");
  const table = path === "activities/state" ? "lrs_state_documents" : path === "agents/profile" ? "lrs_agent_profiles" : "lrs_activity_profiles";
  let query = serviceClient().from(table).select("id,state_id,profile_id,document,content_type,etag,updated_at").eq("registration_id", principal.registration.id);
  if (path === "activities/state") query = query.eq("registration_uuid", registration).eq("agent_hash", agentFingerprint).eq("activity_iri", activityId!);
  else if (path === "agents/profile") query = query.eq("agent_hash", agentFingerprint);
  else query = query.eq("activity_iri", activityId!);
  if (docId) query = query.eq(path === "activities/state" ? "state_id" : "profile_id", docId);
  if (params.has("since")) {
    try { query = query.gt("updated_at", parseIsoDate(params.get("since")!, "since")); }
    catch (error) { return errorResponse(error instanceof Error ? error.message : "Invalid since.", 400, cors); }
  }
  const { data, error } = await query.order("updated_at", { ascending: true });
  if (error) return errorResponse("Document lookup failed.", 500, cors);
  if (docId) {
    const row = data?.[0];
    if (!row) return errorResponse("Document not found.", 404, cors);
  const body = canonicalJson(row.document);
    const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
    const headers = new Headers(cors);
    headers.set("Content-Type", row.content_type ?? "application/json");
    headers.set("ETag", etag);
    headers.set("Last-Modified", new Date(row.updated_at).toUTCString());
    if (etagMatches(request.headers.get("if-none-match"), etag)) return emptyResponse(304, headers);
    return new Response(body, { status: 200, headers });
  }
  const ids = (data ?? []).map((row) => path === "activities/state" ? row.state_id : row.profile_id);
  const headers = new Headers(cors);
  if (data?.length) headers.set("Last-Modified", new Date(data[data.length - 1].updated_at).toUTCString());
  return new Response(JSON.stringify(ids), { status: 200, headers: new Headers({ ...Object.fromEntries(headers), "Content-Type": "application/json; charset=utf-8", "X-Experience-API-Version": "1.0.3", "X-Experience-API-Consistent-Through": new Date().toISOString() }) });
}

async function writeDocumentResource(path: string, method: "PUT" | "POST" | "DELETE", request: Request, principal: LrsPrincipal, cors: Headers) {
  const params = new URL(request.url).searchParams;
  const lookupRequest = new Request(request.url, { method: "GET" });
  const getResult = await getDocumentResource(path, lookupRequest, principal, cors);
  const status = getResult.status;
  const existingBody = status === 200 && method !== "DELETE" ? await getResult.clone().text().catch(() => "") : "";
  const isSingle = (path === "activities/state" ? params.has("stateId") : params.has("profileId"));
  if (method === "DELETE" && !isSingle && path !== "activities/state") return errorResponse("profileId is required for DELETE.", 400, cors);
  if (method !== "DELETE" && !isSingle) return errorResponse(`${path === "activities/state" ? "stateId" : "profileId"} is required for writes.`, 400, cors);
  if (status === 404 && method === "DELETE") return emptyResponse(204, cors);
  if (status !== 200 && status !== 404) return getResult;

  const type = request.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "application/json";
  if (method !== "DELETE" && type !== "application/json") return errorResponse("Only application/json documents are supported by this LRS build.", 415, cors);
  const etag = status === 200 ? `"${createHash("sha1").update(existingBody).digest("hex")}"` : null;
  const ifMatch = request.headers.get("if-match");
  const ifNoneMatch = request.headers.get("if-none-match");
  if (path !== "activities/state" && method === "PUT" && !ifMatch && !ifNoneMatch) return errorResponse("PUT to profile resources requires If-Match or If-None-Match.", status === 200 ? 409 : 400, cors);
  if (ifMatch && (status !== 200 || !etagMatches(ifMatch, etag))) return errorResponse("ETag precondition failed.", 412, cors);
  if (ifNoneMatch && ifNoneMatch !== "*" && !ifMatch) return errorResponse("If-None-Match must be * for document creation.", 400, cors);
  if (ifNoneMatch === "*" && status === 200) return errorResponse("ETag precondition failed.", 412, cors);
  if (method === "DELETE") {
    const { error } = await deleteDocumentRow(path, params, principal);
    return error ? errorResponse("Document deletion failed.", 500, cors) : emptyResponse(204, cors);
  }

  const parsed = await readJsonBody(request, 2_097_152);
  if (parsed.error) return errorResponse("Invalid JSON document.", parsed.error.status, cors);
  let doc = parsed.body;
  if (method === "POST" && status === 200 && type === "application/json") {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return errorResponse("POST merge requires a JSON object.", 400, cors);
    let oldDoc: unknown;
    try { oldDoc = JSON.parse(existingBody); } catch { return errorResponse("Existing document is not a JSON object.", 400, cors); }
    if (!oldDoc || typeof oldDoc !== "object" || Array.isArray(oldDoc)) return errorResponse("Existing document is not a JSON object.", 400, cors);
    doc = { ...(oldDoc as Record<string, unknown>), ...(doc as Record<string, unknown>) };
  }
  const idKey = path === "activities/state" ? "stateId" : "profileId";
  const id = params.get(idKey)!;
  if (!id.length || id.length > 1024) return errorResponse(`${idKey} is invalid.`, 400, cors);
  const etagValue = `"${createHash("sha1").update(canonicalJson(doc)).digest("hex")}"`;
  const updatedAt = new Date().toISOString();
  const common = { document: doc, content_type: type, etag: etagValue, updated_at: updatedAt };
  let writeError: unknown = null;
  if (path === "activities/state") {
    const rawAgent = params.get("agent")!;
    const parsedAgent = parseAgentParameter(rawAgent);
    const registration = params.get("registration") ?? "00000000-0000-0000-0000-000000000000";
    const result = await serviceClient().from("lrs_state_documents").upsert({ ...common, registration_id: principal.registration.id, registration_uuid: registration, agent_hash: parsedAgent.hash, activity_iri: params.get("activityId"), state_id: id }, { onConflict: "registration_id,registration_uuid,agent_hash,activity_iri,state_id" });
    writeError = result.error;
  } else if (path === "agents/profile") {
    const parsedAgent = parseAgentParameter(params.get("agent")!);
    const result = await serviceClient().from("lrs_agent_profiles").upsert({ ...common, registration_id: principal.registration.id, agent_hash: parsedAgent.hash, profile_id: id }, { onConflict: "registration_id,agent_hash,profile_id" });
    writeError = result.error;
  } else {
    const result = await serviceClient().from("lrs_activity_profiles").upsert({ ...common, registration_id: principal.registration.id, activity_iri: params.get("activityId"), profile_id: id }, { onConflict: "registration_id,activity_iri,profile_id" });
    writeError = result.error;
  }
  if (writeError) return errorResponse("Document write failed.", 500, cors);
  return emptyResponse(204, cors);
}

async function deleteDocumentRow(path: string, params: URLSearchParams, principal: LrsPrincipal) {
  const client = serviceClient();
  if (path === "activities/state") {
    let query = client.from("lrs_state_documents").delete().eq("registration_id", principal.registration.id).eq("activity_iri", params.get("activityId")!);
    if (params.has("agent")) query = query.eq("agent_hash", parseAgentParameter(params.get("agent")!).hash);
    if (params.has("registration")) query = query.eq("registration_uuid", params.get("registration")!);
    if (params.has("stateId")) query = query.eq("state_id", params.get("stateId")!);
    const { error } = await query;
    return { error };
  }
  const table = path === "agents/profile" ? "lrs_agent_profiles" : "lrs_activity_profiles";
  let query = client.from(table).delete().eq("registration_id", principal.registration.id).eq("profile_id", params.get("profileId")!);
  if (path === "agents/profile") query = query.eq("agent_hash", parseAgentParameter(params.get("agent")!).hash);
  else query = query.eq("activity_iri", params.get("activityId")!);
  const { error } = await query;
  return { error };
}

async function dispatchGet(path: string, request: Request, principal: LrsPrincipal, cors: Headers) {
  if (path === "statements") return getStatements(request, principal, cors);
  if (path === "agents") return getAgents(request, principal, cors);
  if (path === "activities") return getActivities(request, principal, cors);
  if (["activities/state", "activities/profile", "agents/profile"].includes(path)) return getDocumentResource(path, request, principal, cors);
  return errorResponse("xAPI resource not found.", 404, cors);
}

export async function OPTIONS(request: NextRequest) {
  return preflightXapi(request);
}

export async function GET(request: NextRequest, context: Context) {
  const { segments = [] } = await context.params;
  const path = segments.join("/");
  if (path === "about") {
    const cors = await corsHeaders(request);
    if (cors.denied) return errorResponse("Origin is not allowed for this provider.", 403);
    return jsonResponse({ version: ["1.0.3"], extensions: {} }, 200, cors.headers);
  }
  const auth = await authenticateXapi(request, makeScope(path, "GET"));
  if (auth.error || !auth.principal) return auth.error!;
  return dispatchGet(path, request, auth.principal, auth.cors ?? new Headers());
}

export async function HEAD(request: NextRequest, context: Context) {
  const response = await GET(request, context);
  return new Response(null, { status: response.status, headers: response.headers });
}

export async function POST(request: NextRequest, context: Context) {
  const { segments = [] } = await context.params;
  const path = segments.join("/");
  const auth = await authenticateXapi(request, makeScope(path, "POST"));
  if (auth.error || !auth.principal) return auth.error!;
  const cors = auth.cors ?? new Headers();
  if (path === statementsPath) {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== "registration")) return errorResponse("Unsupported statement write query parameter.", 400, cors);
    const registration = params.get("registration");
    if (registration && !uuidPattern.test(registration)) return errorResponse("registration must be a UUID.", 400, cors);
    return storeStatements(request, auth.principal, cors, undefined, registration ?? undefined);
  }
  if (["activities/state", "activities/profile", "agents/profile"].includes(path)) return writeDocumentResource(path, "POST", request, auth.principal, cors);
  return errorResponse("xAPI resource not found.", 404, cors);
}

export async function PUT(request: NextRequest, context: Context) {
  const { segments = [] } = await context.params;
  const path = segments.join("/");
  const auth = await authenticateXapi(request, makeScope(path, "PUT"));
  if (auth.error || !auth.principal) return auth.error!;
  const cors = auth.cors ?? new Headers();
  if (path === statementsPath) {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== "statementId" && key !== "registration")) return errorResponse("Unsupported statement write query parameter.", 400, cors);
    const statementId = params.get("statementId");
    const registration = params.get("registration");
    if (!statementId || !uuidPattern.test(statementId)) return errorResponse("PUT requires a valid statementId UUID.", 400, cors);
    if (registration && !uuidPattern.test(registration)) return errorResponse("registration must be a UUID.", 400, cors);
    return storeStatements(request, auth.principal, cors, statementId, registration ?? undefined);
  }
  if (["activities/state", "activities/profile", "agents/profile"].includes(path)) return writeDocumentResource(path, "PUT", request, auth.principal, cors);
  return errorResponse("xAPI resource not found.", 404, cors);
}

export async function DELETE(request: NextRequest, context: Context) {
  const { segments = [] } = await context.params;
  const path = segments.join("/");
  const auth = await authenticateXapi(request, makeScope(path, "DELETE"));
  if (auth.error || !auth.principal) return auth.error!;
  const cors = auth.cors ?? new Headers();
  if (["activities/state", "activities/profile", "agents/profile"].includes(path)) return writeDocumentResource(path, "DELETE", request, auth.principal, cors);
  return errorResponse("xAPI resource not found.", 404, cors);
}
