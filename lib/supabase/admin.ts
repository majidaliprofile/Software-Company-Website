import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, assertRuntimeEnv } from "@/lib/env";
export function createAdminClient(){ assertRuntimeEnv(); if(!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server-only operation."); return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{ autoRefreshToken:false, persistSession:false } }); }
