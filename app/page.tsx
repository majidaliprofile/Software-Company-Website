import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function Home() {
  return <main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <div><div className="text-sm font-bold tracking-wide text-slate-900">AS CODE TECH</div><div className="text-xs text-slate-500">AS Code Assess</div></div>
      <span className="text-xs font-medium text-slate-500">Student portal</span>
    </div></header>
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
      <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"><ShieldCheck size={16}/> Secure online assessments</div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">Assess practical learning with confidence.</h1>
        <p className="prose-lite mt-6 max-w-xl text-lg">AS Code Assess gives AS Code Tech students a focused, reliable assessment experience with secure access, server-authoritative timing, and proctoring-ready recording.</p>
        <div className="mt-8"><Link href="/student/login" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Student sign in <ArrowRight size={18}/></Link></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="mb-6 flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Assessment integrity</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span></div><div className="space-y-4">{["One question at a time", "Server-authoritative timer", "Answer locking", "Activity and recording trail"].map(x => <div key={x} className="flex items-center gap-3 rounded-lg border border-slate-100 p-4"><CheckCircle2 className="text-teal-700" size={18}/><span className="text-sm font-medium text-slate-700">{x}</span></div>)}</div><p className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-500">Developed and operated by AS Code Tech · as-code.tech</p></div>
    </section>
  </main>;
}
