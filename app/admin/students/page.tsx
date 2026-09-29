import { requireRole } from "@/lib/auth";
import { StudentManager } from "@/components/StudentManager";

export default async function Students() {
  const { supabase } = await requireRole("ADMIN");
  const { data: students } = await supabase
    .from("profiles")
    .select("id,full_name,email,is_active,created_at")
    .eq("role", "STUDENT")
    .order("created_at", { ascending: false });
  return <StudentManager initialStudents={(students ?? []) as any} />;
}