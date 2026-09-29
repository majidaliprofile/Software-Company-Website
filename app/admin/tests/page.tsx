import { requireRole } from "@/lib/auth";
import { TestManager } from "@/components/TestManager";

export default async function Tests() {
  const { supabase } = await requireRole("ADMIN");
  const { data: tests } = await supabase
    .from("tests")
    .select("id,title,duration_minutes,status,passing_score,created_at")
    .order("created_at", { ascending: false });
  return <TestManager initialTests={(tests ?? []) as any} />;
}