import assert from "node:assert/strict";
import test from "node:test";
import { actorHash, canonicalJson, prepareStatement, relatedActivityIds, relatedAgentHashes, validateStatement, XapiValidationError } from "../../lib/xapi/validation";
import { etagMatches } from "../../lib/xapi/etag";

process.env.SUPABASE_JWT_SECRET = "unit-test-hmac-secret-that-is-not-used-in-production";

const sample = () => ({
  actor: { objectType: "Agent", account: { homePage: "https://lms.example.org", name: "learner-42" } },
  verb: { id: "https://w3id.org/xapi/adl/verbs/experienced", display: { "en-US": "experienced" } },
  object: { id: "https://lms.example.org/course/intro", objectType: "Activity" },
});

test("accepts a minimal xAPI statement and leaves the submitted shape intact", () => {
  const statement = sample();
  assert.deepEqual(validateStatement(statement), statement);
});

test("rejects missing statement properties and ambiguous actor identifiers", () => {
  assert.throws(() => validateStatement({ verb: { id: "https://example.org/v" }, object: { id: "https://example.org/a" } }), XapiValidationError);
  const invalid = sample() as { actor: Record<string, unknown> };
  invalid.actor.mbox = "mailto:learner@example.org";
  assert.throws(() => validateStatement(invalid), /exactly one inverse functional identifier/);
});

test("rejects malformed statement, verb, activity IDs and unsupported top-level fields", () => {
  const invalidId = sample();
  (invalidId.object as Record<string, unknown>).id = "not-an-iri";
  assert.throws(() => validateStatement(invalidId), /absolute IRI/);
  const extra = { ...sample(), unexpected: true };
  assert.throws(() => validateStatement(extra), /Unsupported statement property/);
});

test("allows null only within extension data", () => {
  const allowed = { ...sample(), context: { extensions: { "https://example.org/ext": { note: null } } } };
  assert.doesNotThrow(() => validateStatement(allowed));
  const invalid = { ...sample(), result: { response: null } };
  assert.throws(() => validateStatement(invalid), XapiValidationError);
});

test("canonical JSON sorts object keys while preserving array order", () => {
  assert.equal(canonicalJson({ z: 2, a: { y: 1, x: 0 } }), '{"a":{"x":0,"y":1},"z":2}');
  assert.equal(canonicalJson([2, 1]), "[2,1]");
});

test("actor hashing is stable and normalizes only the email domain", () => {
  assert.equal(actorHash({ mbox: "mailto:CaseSensitive@EXAMPLE.org" }), actorHash({ objectType: "Agent", mbox: "mailto:CaseSensitive@example.org" }));
  assert.notEqual(actorHash({ mbox: "mailto:casesensitive@example.org" }), actorHash({ mbox: "mailto:CaseSensitive@example.org" }));
});

test("prepares assigned statement fields without treating self-report as completion", () => {
  const first = prepareStatement(sample(), { registrationId: "00000000-0000-4000-8000-000000000001", registrationName: "Test Provider", baseUrl: "https://tgl.example.org" });
  assert.ok(first.statementId);
  assert.ok(first.statementJson.stored);
  assert.ok(first.statementJson.timestamp);
  assert.equal(first.statementJson.result, undefined);
  assert.equal(first.timestampWasAssigned, true);
  const retry = prepareStatement(first.statementJson, { registrationId: "00000000-0000-4000-8000-000000000001", registrationName: "Test Provider", baseUrl: "https://tgl.example.org", existingTimestampAssigned: true });
  assert.equal(first.statementHash, retry.statementHash);
});

test("anonymous Group identity is stable regardless of member order", () => {
  const members = [
    { objectType: "Agent", mbox: "mailto:a@example.org" },
    { objectType: "Agent", mbox: "mailto:b@example.org" },
  ];
  assert.equal(actorHash({ objectType: "Group", member: members }), actorHash({ objectType: "Group", member: [...members].reverse() }));
});

test("timestamps require an explicit timezone", () => {
  const statement = { ...sample(), timestamp: "2026-11-12T10:30:00" };
  assert.throws(() => validateStatement(statement), /with a timezone/);
});

test("matches strong, weak, wildcard, and comma-separated ETags", () => {
  const current = '"a1b2"';
  assert.equal(etagMatches(current, current), true);
  assert.equal(etagMatches(`W/${current}`, current), true);
  assert.equal(etagMatches(`"older", ${current}`, current), true);
  assert.equal(etagMatches("*", current), true);
  assert.equal(etagMatches('"other"', current), false);
});

test("extracts context activity and related agent identifiers", () => {
  const statement = {
    ...sample(),
    context: {
      instructor: { objectType: "Agent", mbox: "mailto:mentor@example.org" },
      contextActivities: { grouping: [{ id: "https://lms.example.org/path/1" }] },
    },
  };
  assert.ok(relatedAgentHashes(statement).includes(actorHash(statement.context.instructor)));
  assert.ok(relatedActivityIds(statement).includes("https://lms.example.org/course/intro"));
  assert.ok(relatedActivityIds(statement).includes("https://lms.example.org/path/1"));
});
