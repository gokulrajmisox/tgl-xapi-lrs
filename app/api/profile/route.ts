import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveCurrentActor,
  updateSandboxDisplayName,
} from "@/lib/certifications/store";
import {
  createSignedSessionToken,
  FIREBASE_SESSION_COOKIE_NAME,
  getAdminAuth,
  getAdminFirestore,
  getAuthenticatedFirebaseActor,
  isFirebaseAuthConfigured,
} from "@/lib/firebase/server";

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  avatarUrl: z.string().url().max(512).optional().nullable(),
});

export async function GET(request: Request) {
  const actor = await resolveCurrentActor({ request });
  if (actor.configured && !actor.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json(
    { user: actor.user, isSandbox: Boolean(actor.user?.isSandbox) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter your full name." },
      { status: 400 },
    );
  }

  const firebaseActor = await getAuthenticatedFirebaseActor(request);
  if (firebaseActor) {
    const trimmedName = parsed.data.fullName.trim();
    const safeAvatarUrl = parsed.data.avatarUrl ?? firebaseActor.avatarUrl ?? null;
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      await adminAuth
        .updateUser(firebaseActor.uid, {
          displayName: trimmedName,
          ...(safeAvatarUrl ? { photoURL: safeAvatarUrl } : {}),
        })
        .catch(() => {});
    }

    const db = getAdminFirestore();
    if (db) {
      await db
        .collection("users")
        .doc(firebaseActor.uid)
        .set(
          {
            uid: firebaseActor.uid,
            displayName: trimmedName,
            role: firebaseActor.role,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        .catch(() => {});

      if (safeAvatarUrl) {
        await db
          .collection("users")
          .doc(firebaseActor.uid)
          .collection("private")
          .doc("info")
          .set(
            {
              avatarUrl: safeAvatarUrl,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )
          .catch(() => {});
      }
    }

    const updatedSession = createSignedSessionToken({
      ...firebaseActor,
      displayName: trimmedName,
      avatarUrl: safeAvatarUrl,
    });
    const response = NextResponse.json(
      {
        fullName: trimmedName,
        avatarUrl: safeAvatarUrl,
        user: {
          id: firebaseActor.uid,
          name: trimmedName,
          email: firebaseActor.email,
          role: firebaseActor.role,
          isSandbox: false,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(FIREBASE_SESSION_COOKIE_NAME, updatedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });
    return response;
  }

  if (!isFirebaseAuthConfigured()) {
    const actor = await resolveCurrentActor({ request });
    if (!actor.user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const updated = updateSandboxDisplayName(actor.user.id, parsed.data.fullName);
    return NextResponse.json(
      { fullName: updated, user: { ...actor.user, name: updated } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}
