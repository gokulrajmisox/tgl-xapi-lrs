import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "./mock";

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return createMockSupabaseClient() as unknown as SupabaseClient;
  }
  return createBrowserClient(
    url,
    key,
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  );
}
