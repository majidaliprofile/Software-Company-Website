import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractQuestionPaper } from "@/lib/document-import";
import { parsePlainText } from "@/lib/question-parser";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (profile?.role !== "ADMIN" || !profile.is_active) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a PDF, DOCX, or TXT question paper." }, { status: 400 });
  try {
    const text = await extractQuestionPaper(file);
    const questions = parsePlainText(text);
    return NextResponse.json({ questions, published: false, note: "Preview only. Questions are not saved or published automatically." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Question paper could not be parsed." }, { status: 400 });
  }
}
