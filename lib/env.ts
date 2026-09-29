import { z } from "zod";
const schema=z.object({NEXT_PUBLIC_SUPABASE_URL:z.string().url(),NEXT_PUBLIC_SUPABASE_ANON_KEY:z.string().min(1),NEXT_PUBLIC_APP_URL:z.string().url(),SUPABASE_SERVICE_ROLE_KEY:z.string().min(1).optional()});
const raw={NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_APP_URL:process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
const parsed=schema.safeParse(raw);
// Next.js evaluates server bundles during build. Fail with a clear message when the
// application is actually used, rather than making `next build` require secrets.
export const env=parsed.success ? parsed.data : { ...raw, NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL ?? "", NEXT_PUBLIC_SUPABASE_ANON_KEY: raw.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" };
export function assertRuntimeEnv(){ if(!parsed.success) throw new Error(`Missing or invalid environment variables: ${parsed.error.issues.map(i=>i.path.join(".")).join(", ")}`); }
