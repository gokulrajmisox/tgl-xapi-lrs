import { randomUUID } from "node:crypto";

const TESTMAIL_ENDPOINT = "https://api.testmail.app/api/json";
const TESTMAIL_TAGS = [
  "signup",
  "email-verification",
  "enrollment",
  "project-submission",
  "project-review",
  "certificate",
  "password-reset",
] as const;

export type TestmailTag = (typeof TESTMAIL_TAGS)[number];
export type TestmailEmail = {
  id?: string;
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  timestamp?: number | string;
  [key: string]: unknown;
};

export type TestmailQueryResult = {
  result?: string;
  count?: number;
  emails?: TestmailEmail[];
  [key: string]: unknown;
};

function getTestmailConfig() {
  const apiKey = process.env.TESTMAIL_APIKEY?.trim() || "";
  const namespace = process.env.TESTMAIL_NAMESPACE?.trim() || "";
  const enabled =
    process.env.TESTMAIL_ENABLED === "true" ||
    (process.env.NODE_ENV !== "production" && Boolean(apiKey && namespace));
  return { apiKey, namespace, enabled };
}

export function getTestmailStatus() {
  const { apiKey, namespace, enabled } = getTestmailConfig();
  return {
    enabled,
    configured: enabled && Boolean(apiKey && namespace),
    namespaceConfigured: Boolean(namespace),
    apiKeyConfigured: Boolean(apiKey),
    supportedTags: TESTMAIL_TAGS,
  };
}

export function generateTestmailInbox(tag: TestmailTag | string, runId = randomUUID().slice(0, 12)) {
  const { namespace } = getTestmailConfig();
  if (!namespace) throw new Error("TESTMAIL_NAMESPACE is not configured.");
  const safeTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "test";
  const safeRunId = runId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || randomUUID().slice(0, 12);
  const fullTag = `${safeTag}-${safeRunId}`;
  return {
    tag: fullTag,
    address: `${namespace}.${fullTag}@inbox.testmail.app`,
    timestampFrom: Date.now(),
  };
}

export async function queryTestmail(params: {
  tag?: string;
  tagPrefix?: string;
  timestampFrom?: number;
  timestampTo?: number;
  livequery?: boolean;
  limit?: number;
  offset?: number;
}): Promise<TestmailQueryResult> {
  const { apiKey, namespace, enabled } = getTestmailConfig();
  if (!enabled) throw new Error("Testmail is disabled outside development/test mode.");
  if (!apiKey || !namespace) throw new Error("TESTMAIL_APIKEY and TESTMAIL_NAMESPACE are required.");

  const url = new URL(TESTMAIL_ENDPOINT);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("namespace", namespace);
  if (params.tag) url.searchParams.set("tag", params.tag);
  if (params.tagPrefix) url.searchParams.set("tag_prefix", params.tagPrefix);
  if (params.timestampFrom !== undefined) url.searchParams.set("timestamp_from", String(params.timestampFrom));
  if (params.timestampTo !== undefined) url.searchParams.set("timestamp_to", String(params.timestampTo));
  if (params.livequery) url.searchParams.set("livequery", "true");
  if (params.limit !== undefined) url.searchParams.set("limit", String(Math.min(100, Math.max(0, params.limit))));
  if (params.offset !== undefined) url.searchParams.set("offset", String(Math.min(9899, Math.max(0, params.offset))));

  const response = await fetch(url, { signal: AbortSignal.timeout(35_000), redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error(`Testmail API HTTP ${response.status}.`);
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== "object") throw new Error("Testmail API returned an invalid response.");
  return body as TestmailQueryResult;
}

export function extractLinks(text: string) {
  return text.match(/https?:\/\/[^\s<>"')]+/g) ?? [];
}

export function extractOtpCodes(text: string) {
  return text.match(/\b[A-Z0-9]{6,8}\b/g) ?? [];
}
