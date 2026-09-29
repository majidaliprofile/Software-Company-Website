import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: Array<string | false | null | undefined>) { return twMerge(clsx(inputs)); }
export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn("rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}/>; }
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-soft", className)} {...props}/>; }
export function Badge({ tone="slate", children }: { tone?: "slate" | "green" | "amber" | "red" | "blue"; children: React.ReactNode }) { const colors={slate:"bg-slate-100 text-slate-700",green:"bg-emerald-50 text-emerald-700",amber:"bg-amber-50 text-amber-700",red:"bg-red-50 text-red-700",blue:"bg-blue-50 text-blue-700"}; return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",colors[tone])}>{children}</span>; }
