import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "@/lib/supabase/mock";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  );
}

export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000101";

export const serviceClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return createMockSupabaseClient() as unknown as SupabaseClient;
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
