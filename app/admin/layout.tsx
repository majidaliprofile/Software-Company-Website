export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
export default function AdminLayout({children}:{children:React.ReactNode}){return <AppShell role="ADMIN">{children}</AppShell>}
