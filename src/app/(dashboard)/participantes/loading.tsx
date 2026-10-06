export default function Loading() {
  return <div className="mx-auto max-w-5xl animate-pulse"><div className="h-10 w-52 rounded-xl bg-white/10"/><div className="mt-3 h-4 w-36 rounded bg-white/5"/><div className="mt-8 h-12 rounded-xl bg-white/5"/><div className="mt-5 flex gap-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-9 w-24 rounded-full bg-white/5"/>)}</div><div className="mt-6 grid gap-3 lg:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="card h-24 bg-white/[.03]"/>)}</div></div>;
}
