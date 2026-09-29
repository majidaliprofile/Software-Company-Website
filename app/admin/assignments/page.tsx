import { requireRole } from "@/lib/auth";
import { AssignmentManager } from "@/components/AssignmentManager";

export default async function Assignments() {
  const { supabase } = await requireRole("ADMIN");
  const [{ data: students }, { data: tests }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email").eq("role", "STUDENT").eq("is_active", true).order("full_name"),
    supabase.from("tests").select("id,title").eq("status", "PUBLISHED").order("title"),
    supabase.from("test_assignments").select("id,status,assigned_at,due_at,profiles!inner(full_name,email),tests!inner(id,title,status,starts_at,ends_at)").order("assigned_at", { ascending: false }).limit(100),
  ]);
  return <AssignmentManager students={(students ?? []) as any} tests={(tests ?? []) as any} initialRows={(rows ?? []) as any} />;
}