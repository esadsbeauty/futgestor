export default function Loading() {
  return <div className="mx-auto max-w-5xl animate-pulse"><div className="h-10 w-52 rounded-xl bg-white/10"/><div className="mt-3 h-4 w-72 rounded bg-white/5"/><div className="mt-8 grid gap-6 lg:grid-cols-[190px_1fr]"><div className="hidden space-y-2 lg:block">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 rounded-xl bg-white/5"/>)}</div><div className="space-y-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="card h-64 bg-white/[.03]"/>)}</div></div></div>;
}
