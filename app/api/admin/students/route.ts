import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAdmin } from "@/lib/api-auth";
import { passwordSchema } from "@/lib/validation";

const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = createStudentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Student account could not be created." }, { status: 400 });
  }
  const { error: profileError } = await auth.supabase.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: "STUDENT",
    is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "Student profile could not be created." }, { status: 500 });
  }
  return NextResponse.json({ student: { id: data.user.id, email: data.user.email, fullName: parsed.data.fullName } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const body = await request.json() as { studentId?: string; isActive?: boolean };
  if (!body.studentId || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Student and status are required." }, { status: 400 });
  }
  const { error } = await auth.supabase.from("profiles").update({ is_active: body.isActive }).eq("id", body.studentId).eq("role", "STUDENT");
  if (error) return NextResponse.json({ error: "Student status could not be updated." }, { status: 400 });
  return NextResponse.json({ ok: true });
}