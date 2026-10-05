import { Link } from 'react-router-dom';

export function MetricCard({ label, value, to, hint }: { label: string; value: number; to: string; hint?: string }) {
  return <Link to={to} aria-label={`${label}: ${value}`} className="block min-w-0 rounded-xl border border-[#D1E0D8] bg-white p-4 shadow-sm transition-colors hover:border-[#006B3C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006B3C]">
    <span className="block text-sm font-semibold text-[#294536]">{label}</span>
    <strong className="mt-2 block text-3xl text-[#006B3C]">{value}</strong>
    {hint && <span className="mt-1 block text-xs text-[#4A6355]">{hint}</span>}
  </Link>;
}

export function DashboardPanel({ title, children, empty, emptyTo, emptyLabel }: { title: string; children: React.ReactNode; empty?: boolean; emptyTo: string; emptyLabel: string }) {
  return <section className="min-w-0 rounded-xl border border-[#D1E0D8] bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold text-[#1A2E22]">{title}</h2>
    {empty ? <div className="mt-3 rounded-lg bg-[#F0F4F1] p-4 text-sm text-[#4A6355]">No matching items right now. <Link to={emptyTo} className="font-semibold text-[#006B3C] underline">{emptyLabel}</Link></div> : <ul className="mt-3 space-y-3">{children}</ul>}
  </section>;
}

export function DashboardRow({ to, title, subtitle, detail }: { to: string; title: string; subtitle: string; detail: string }) {
  return <li className="min-w-0 rounded-lg border border-[#D1E0D8] p-3 text-sm">
    <Link to={to} className="break-all font-semibold text-[#006B3C] underline-offset-2 hover:underline">{title}</Link>
    <p className="mt-1 break-words text-[#1A2E22]">{subtitle}</p>
    <p className="mt-1 text-xs text-[#4A6355]">{detail}</p>
  </li>;
}

export function DashboardLoading() {
  return <main className="mx-auto max-w-7xl p-4 md:p-8"><p role="status" className="text-sm text-[#4A6355]">Loading dashboard…</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#E9F0EB]" />)}</div></main>;
}

export function DashboardError({ message, retry }: { message: string; retry: () => void }) {
  return <main className="mx-auto max-w-3xl p-4 md:p-8"><div role="alert" className="rounded-xl border border-[#F5B8B8] bg-[#FFF1F1] p-5 text-[#991B1B]"><p>{message}</p><button type="button" onClick={retry} className="mt-3 rounded-lg border border-[#991B1B] px-3 py-2 font-semibold">Retry dashboard</button></div></main>;
}
