import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireApiAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, response: NextResponse.json({ error: "You must be signed in." }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "ADMIN" || !profile.is_active) {
    return { supabase, user: null, response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }) };
  }
  return { supabase, user, response: null };
}