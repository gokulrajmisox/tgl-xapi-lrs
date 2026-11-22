"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { onIdTokenChanged, type User } from "firebase/auth";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import {
  clearClientUserCaches,
  ensureAuthPersistence,
  fetchServerSessionState,
  getFirebaseAuth,
  initFirebaseAppCheck,
  resolveOrCreateUserProfileFromFirestore,
  syncServerSessionCookie,
  testFirestoreConnection,
  type ClientUserProfile,
} from "@/lib/firebase/client";

export type FirebaseAuthContextValue = {
  user: User | null;
  profile: ClientUserProfile | null;
  loading: boolean;
  configured: boolean;
  isStaff: boolean;
  authError: string | null;
  refreshSession: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({
  user: null,
  profile: null,
  loading: false,
  configured: true,
  isStaff: false,
  authError: null,
  refreshSession: async () => {},
});

export function useFirebaseAuth(): FirebaseAuthContextValue {
  return useContext(FirebaseAuthContext);
}

class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "An unexpected client error occurred.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-foreground"
        >
          <p className="font-semibold">Unable to display this section right now</p>
          <p className="mt-2 text-xs text-muted-foreground">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseClientConfigured();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ClientUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [authError, setAuthError] = useState<string | null>(null);
  const activeUidRef = useRef<string | null | undefined>(undefined);
  const syncSeqRef = useRef(0);

  const reconcileSession = useCallback(
    async (nextUser: User | null) => {
      const seq = ++syncSeqRef.current;
      const nextUid = nextUser?.uid ?? null;
      const uidChanged =
        activeUidRef.current !== undefined && activeUidRef.current !== nextUid;

      if (uidChanged) {
        clearClientUserCaches();
        setProfile(null);
      }

      if (nextUser === null) {
        setUser(null);
        setProfile(null);
        setAuthError(null);
        activeUidRef.current = null;

        try {
          const serverSnap = await fetchServerSessionState();
          if (seq !== syncSeqRef.current) return;
          if (serverSnap?.authenticated) {
            await syncServerSessionCookie(null);
            if (seq !== syncSeqRef.current) return;
            router.refresh();
          }
        } finally {
          if (seq === syncSeqRef.current) {
            setLoading(false);
          }
        }
        return;
      }

      setUser(nextUser);
      setAuthError(null);
      activeUidRef.current = nextUid;

      try {
        const [serverSnap, loadedProfile] = await Promise.all([
          fetchServerSessionState(),
          resolveOrCreateUserProfileFromFirestore(nextUser).catch((err) => {
            setAuthError(err instanceof Error ? err.message : "Failed to verify user profile.");
            return null;
          }),
        ]);

        if (seq !== syncSeqRef.current) return;

        if (loadedProfile) {
          setProfile(loadedProfile);
        }

        const serverMismatch =
          !serverSnap?.authenticated || serverSnap.user?.id !== nextUid;

        if (serverMismatch) {
          await syncServerSessionCookie(nextUser, false);
          if (seq !== syncSeqRef.current) return;
          router.refresh();
        } else if (uidChanged) {
          router.refresh();
        }
      } finally {
        if (seq === syncSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [router],
  );

  const refreshSession = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    const auth = await ensureAuthPersistence();
    const current = auth.currentUser;
    if (current) {
      await current.reload().catch(() => {});
      await syncServerSessionCookie(auth.currentUser, true);
    }
    await reconcileSession(auth.currentUser);
  }, [configured, reconcileSession]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    initFirebaseAppCheck();
    void testFirestoreConnection();

    let unsubscribed = false;
    let unsubscribeListener: (() => void) | null = null;

    void ensureAuthPersistence().then(() => {
      if (unsubscribed) return;
      const auth = getFirebaseAuth();
      unsubscribeListener = onIdTokenChanged(auth, (nextUser) => {
        setLoading(true);
        void reconcileSession(nextUser);
      });
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") return;
      const auth = getFirebaseAuth();
      void fetchServerSessionState().then((serverSnap) => {
        const clientUid = auth.currentUser?.uid ?? null;
        const serverUid = serverSnap?.authenticated ? serverSnap.user?.id ?? null : null;
        if (clientUid !== serverUid) {
          void reconcileSession(auth.currentUser);
        }
      });
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      unsubscribed = true;
      if (unsubscribeListener) unsubscribeListener();
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [configured, reconcileSession]);

  const isStaff = Boolean(
    user?.emailVerified && isPrivilegedStaffEmail(user.email),
  );

  return (
    <FirebaseErrorBoundary>
      <FirebaseAuthContext.Provider
        value={{
          user,
          profile,
          loading,
          configured,
          isStaff,
          authError,
          refreshSession,
        }}
      >
        {children}
      </FirebaseAuthContext.Provider>
    </FirebaseErrorBoundary>
  );
}
