import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, assertRuntimeEnv } from "@/lib/env";
type CookieEntry={name:string;value:string;options?:Record<string,unknown>};
export async function createClient(){ assertRuntimeEnv(); const cookieStore=await cookies(); return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies:{ getAll(){return cookieStore.getAll()}, setAll(cookiesToSet:CookieEntry[]){try{cookiesToSet.forEach(({name,value,options})=>cookieStore.set(name,value,options as any))}catch{}} } }); }
