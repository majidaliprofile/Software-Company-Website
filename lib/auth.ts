import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireUser(){ const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/admin/login"); return {supabase,user}; }
export async function requireRole(role: "ADMIN" | "STUDENT"){ const {supabase,user}=await requireUser(); const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).single(); if(!profile || profile.role!==role || !profile.is_active) redirect(role === "ADMIN" ? "/admin/login?error=unauthorized" : "/student/login?error=unauthorized"); return {supabase,user,profile}; }
