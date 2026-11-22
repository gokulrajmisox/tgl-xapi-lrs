import { NextResponse } from "next/server";
import { z } from "zod";
import { syncFirebaseUserRecord } from "@/lib/auth/profile-sync";
import {
  createSignedSessionToken,
  FIREBASE_SESSION_COOKIE_NAME,
  getAuthenticatedFirebaseActor,
  verifyFirebaseIdToken,
} from "@/lib/firebase/server";

const SessionPayloadSchema = z.object({
  idToken: z.string().min(20),
  displayName: z.string().trim().max(120).optional(),
});

function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto?.toLowerCase().includes("https")) return true;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export async function GET(request: Request) {
  const actor = await getAuthenticatedFirebaseActor(request);
  const secure = isHttpsRequest(request);

  if (!actor) {
    const res = NextResponse.json(
      { authenticated: false, user: null },
      { headers: { "Cache-Control": "no-store" } },
    );
    // Clean up any stale or forged cookie present on the request
    if (request.headers.get("cookie")?.includes(FIREBASE_SESSION_COOKIE_NAME)) {
      res.cookies.set(FIREBASE_SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return res;
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: actor.uid,
        email: actor.email,
        name: actor.displayName,
        role: actor.role,
        emailVerified: actor.emailVerified,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const parsed = SessionPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid Firebase ID token is required." },
      { status: 400 },
    );
  }

  const verified = await verifyFirebaseIdToken(parsed.data.idToken);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or expired Firebase authentication token." },
      { status: 401 },
    );
  }

  const effectiveName = parsed.data.displayName?.trim() || verified.displayName;
  const actor = {
    ...verified,
    displayName: effectiveName,
  };

  await syncFirebaseUserRecord(actor);

  const sessionToken = createSignedSessionToken(actor);
  const response = NextResponse.json(
    {
      authenticated: true,
      user: {
        id: actor.uid,
        email: actor.email,
        name: actor.displayName,
        role: actor.role,
        emailVerified: actor.emailVerified,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set(FIREBASE_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 5,
  });

  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json(
    { authenticated: false, user: null },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(FIREBASE_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
