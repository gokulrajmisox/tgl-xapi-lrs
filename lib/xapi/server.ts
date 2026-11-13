import { scrypt, timingSafeEqual } from "node:crypto";
import { secretHmac } from "./crypto";
export { secretHmac } from "./crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export const XAPI_VERSION = "1.0.3";
const SUPPORTED_REQUEST_VERSIONS = new Set(["1.0.0", "1.0.1", "1.0.2", "1.0.3"]);

export type LrsRegistration = {
  id: string;
  name: string;
  provider_type: string;
  source_identifier: string;
  description: string;
  enabled: boolean;
  scopes: string[];
  allowed_origins: string[];
  actor_mapping_policy: string;
};

export type LrsPrincipal = {
  registration: LrsRegistration;
  credential: { id: string; credential_key: string; scopes: string[] };
};

export const serviceClient = () => createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Experience-API-Version": XAPI_VERSION,
    "X-Experience-API-Consistent-Through": new Date().toISOString(),
    "Cache-Control": "no-store",
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}

export function emptyResponse(status: number, extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "X-Experience-API-Version": XAPI_VERSION,
    "X-Experience-API-Consistent-Through": new Date().toISOString(),
    "Cache-Control": "no-store",
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(null, { status, headers });
}

export function errorResponse(message: string, status: number, extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Experience-API-Version": XAPI_VERSION,
    "X-Experience-API-Consistent-Through": new Date().toISOString(),
    "Cache-Control": "no-store",
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(message, { status, headers });
}

function authChallenge() {
  return { "WWW-Authenticate": 'Basic realm="TGL xAPI", charset="UTF-8"' };
}

function decodeBasic(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;
  let decoded: string;
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); } catch { return null; }
  const separator = decoded.indexOf(":");
  if (separator < 1) return null;
  return { key: decoded.slice(0, separator), secret: decoded.slice(separator + 1) };
}

export function deriveCredential(secret: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(secret, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, result) => {
      if (error) reject(error);
      else resolve(result as Buffer);
    });
  });
}

async function consumeLimit(rateKey: string, count: number, windowSeconds: number) {
  const { data, error } = await serviceClient().rpc("consume_lrs_rate_limit", {
    p_rate_key: rateKey,
    p_max_requests: count,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

export async function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return { headers: new Headers(), denied: false };
  let validOrigin = false;
  try { validOrigin = new URL(origin).origin === origin && origin !== "null"; } catch { validOrigin = false; }
  if (!validOrigin) return { headers: new Headers(), denied: true };
  const client = serviceClient();
  const { data, error } = await client.from("lrs_registrations").select("id").eq("enabled", true).contains("allowed_origins", [origin]).limit(1);
  if (error || !data?.length) return { headers: new Headers(), denied: true };
  return {
    headers: new Headers({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Experience-API-Version, If-Match, If-None-Match, If-Modified-Since, If-Unmodified-Since",
      "Access-Control-Expose-Headers": "ETag, Last-Modified, X-Experience-API-Version, X-Experience-API-Consistent-Through",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    }),
    denied: false,
  };
}

export async function authenticateXapi(request: Request, requiredScope?: string) {
  const cors = await corsHeaders(request);
  if (cors.denied) return { principal: null, error: errorResponse("Origin is not allowed for this provider.", 403) };
  const requestUrl = new URL(request.url);
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const isSecure = requestUrl.protocol === "https:" || (requestUrl.hostname === "localhost" && requestUrl.protocol === "http:") || (requestUrl.hostname === "127.0.0.1" && requestUrl.protocol === "http:");
  if (!isSecure && forwardedProtocol !== "https") return { principal: null, error: errorResponse("Basic authentication requires HTTPS.", 400, cors.headers) };
  const version = request.headers.get("X-Experience-API-Version");
  if (!version || !SUPPORTED_REQUEST_VERSIONS.has(version)) {
    return { principal: null, error: errorResponse("X-Experience-API-Version must be a supported 1.0.x version.", 400, cors.headers) };
  }
  const forwardFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await consumeLimit(`ip:${secretHmac(forwardFor)}`, 600, 60))) {
    return { principal: null, error: errorResponse("Rate limit exceeded.", 429, cors.headers) };
  }
  const basic = decodeBasic(request.headers.get("authorization"));
  if (!basic || basic.key.length > 128 || basic.secret.length > 512) {
    return { principal: null, error: errorResponse("Authentication required.", 401, { ...Object.fromEntries(cors.headers), ...authChallenge() }) };
  }

  const client = serviceClient();
  const { data: credential, error: credentialError } = await client.from("lrs_credentials")
    .select("id,registration_id,credential_key,credential_salt,credential_hash,scopes,expires_at,revoked_at")
    .eq("credential_key", basic.key).maybeSingle();
  if (credentialError) return { principal: null, error: errorResponse("Authentication service unavailable.", 503, cors.headers) };
  if (!credential || credential.revoked_at || (credential.expires_at && Date.parse(credential.expires_at) <= Date.now())) {
    return { principal: null, error: errorResponse("Authentication refused.", 401, { ...Object.fromEntries(cors.headers), ...authChallenge() }) };
  }
  if (!(await consumeLimit(`credential:${credential.id}`, 300, 60))) {
    return { principal: null, error: errorResponse("Rate limit exceeded.", 429, cors.headers) };
  }
  const calculated = await deriveCredential(basic.secret, credential.credential_salt);
  const expected = Buffer.from(credential.credential_hash, "hex");
  if (expected.length !== calculated.length || !timingSafeEqual(expected, calculated)) {
    return { principal: null, error: errorResponse("Authentication refused.", 401, { ...Object.fromEntries(cors.headers), ...authChallenge() }) };
  }
  const { data: registration, error: registrationError } = await client.from("lrs_registrations")
    .select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy")
    .eq("id", credential.registration_id).maybeSingle();
  if (registrationError) return { principal: null, error: errorResponse("Authentication service unavailable.", 503, cors.headers) };
  if (!registration?.enabled) return { principal: null, error: errorResponse("Provider registration is disabled.", 403, cors.headers) };
  const registrationScopes = registration.scopes ?? [];
  const credentialScopes = credential.scopes?.length ? credential.scopes : registrationScopes;
  const scopes = [...new Set(credentialScopes.filter((scope: string) => registrationScopes.includes(scope)))];
  if (requiredScope && !scopes.includes(requiredScope)) return { principal: null, error: errorResponse("Insufficient provider scope.", 403, cors.headers) };

  const now = new Date().toISOString();
  await Promise.all([
    client.from("lrs_credentials").update({ last_used_at: now }).eq("id", credential.id),
    client.from("lrs_registrations").update({ last_used_at: now }).eq("id", registration.id),
  ]);
  return { principal: { registration, credential: { id: credential.id, credential_key: credential.credential_key, scopes } } as LrsPrincipal, error: null, cors: cors.headers };
}

export async function preflightXapi(request: Request) {
  const cors = await corsHeaders(request);
  if (cors.denied) return errorResponse("Origin is not allowed for this provider.", 403);
  return emptyResponse(204, cors.headers);
}

export async function requireLrsAdmin() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.app_metadata?.role !== "admin") return { user: null, error: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  return { user, error: null };
}

