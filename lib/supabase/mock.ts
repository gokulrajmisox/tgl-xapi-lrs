/* eslint-disable @typescript-eslint/no-explicit-any */
// In-memory mock fallback used when Supabase environment variables are not configured.

function createQueryBuilder(isMutation = false) {
  const result = isMutation
    ? { data: null, error: { message: "Supabase is not configured.", code: "not_configured" } }
    : { data: [] as any[], error: null };

  const builder: any = {
    select: () => builder,
    insert: () => createQueryBuilder(true),
    update: () => createQueryBuilder(true),
    upsert: () => createQueryBuilder(true),
    delete: () => createQueryBuilder(true),
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    is: () => builder,
    gte: () => builder,
    lte: () => builder,
    gt: () => builder,
    lt: () => builder,
    contains: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    maybeSingle: async () => (isMutation ? result : { data: null, error: null }),
    single: async () => (isMutation ? result : { data: null, error: null }),
    then: (resolve: (value: any) => any, reject?: (reason: any) => any) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return builder;
}

let warnedMissingSupabase = false;

export function warnMissingSupabaseOnce() {
  if (!warnedMissingSupabase) {
    warnedMissingSupabase = true;
    console.warn("[AI Studio] Supabase env vars not configured — using mock client");
  }
}

export function createMockSupabaseClient(): any {
  warnMissingSupabaseOnce();
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: { message: "Supabase is not configured." },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase is not configured.", code: "not_configured", status: 503 },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase is not configured.", code: "not_configured", status: 503 },
      }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "Supabase is not configured." },
      }),
      updateUser: async () => ({
        data: { user: null },
        error: { message: "Supabase is not configured." },
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => createQueryBuilder(false),
    rpc: async () => ({
      data: null,
      error: { message: "Supabase is not configured.", code: "not_configured" },
    }),
  };
}
