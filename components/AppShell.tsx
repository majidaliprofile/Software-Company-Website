"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpenCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const adminItems = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/students", "Students", Users],
  ["/admin/tests", "Tests", ClipboardList],
  ["/admin/assignments", "Assignments", UserPlus],
  ["/admin/import", "Import questions", ClipboardList],
  ["/admin/attempts", "Attempts", BookOpenCheck],
  ["/admin/recordings", "Recordings", Video],
  ["/admin/activity", "Activity logs", Activity],
  ["/admin/settings", "Settings", Settings],
] as const;

const publicPaths = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/student/login",
  "/student/forgot-password",
  "/student/reset-password",
];

export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "STUDENT";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items =
    role === "ADMIN"
      ? adminItems
      : ([
          ["/student", "My assessments", ClipboardList],
          ["/student/settings", "Account security", Settings],
        ] as const);

  if (publicPaths.includes(pathname)) return <>{children}</>;

  async function logout() {
    await createClient().auth.signOut();
    router.replace(role === "ADMIN" ? "/admin/login" : "/student/login");
    router.refresh();
  }

  function Navigation({ mobile = false }: { mobile?: boolean }) {
    return (
      <nav className="space-y-1 p-4">
        {items.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href as any}
            onClick={() => mobile && setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
              pathname === href
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="text-sm font-bold tracking-wide text-slate-900">
            AS CODE TECH
          </div>
          <div className="mt-1 text-xs text-slate-500">AS Code Assess</div>
        </div>
        <Navigation />
        <div className="absolute bottom-5 left-4 right-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-sm font-bold tracking-wide text-slate-900">
                  AS CODE TECH
                </div>
                <div className="mt-1 text-xs text-slate-500">AS Code Assess</div>
              </div>
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <Navigation mobile />
            <button
              onClick={logout}
              className="absolute bottom-5 left-4 right-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {role === "ADMIN" ? "Administration" : "Student portal"}
            </span>
          </div>
          <span className="hidden text-xs text-slate-500 sm:block">
            Developed by AS Code Tech
          </span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}