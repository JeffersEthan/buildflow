import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const FEATURES = [
  {
    title: "Projects & scheduling",
    body: "Keep every job on one timeline — phases, milestones, and who is doing what, visible to the whole crew.",
  },
  {
    title: "Budgets, estimates & change orders",
    body: "Track estimated versus actual costs line by line, send professional estimates, and document every change with approvals.",
  },
  {
    title: "Daily logs & to-dos",
    body: "Log weather, crew, and hours from the field, and keep punch lists moving with assigned to-dos.",
  },
  {
    title: "Files & photos",
    body: "One organized home for plans, contracts, and job-site photos — attached to the project they belong to.",
  },
  {
    title: "Selections",
    body: "Route finish and fixture choices to clients for approval so decisions never stall the schedule.",
  },
  {
    title: "Client portal",
    body: "Give homeowners a clear, read-mostly window into progress, upcoming work, and open decisions.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <p className="text-xl font-bold tracking-tight">BuildFlow</p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
          Open-source construction management
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Run every job from bid to final walkthrough in one place.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          BuildFlow brings your projects, schedules, budgets, daily logs,
          files, and client communication together — so the office and the
          field always see the same picture.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Open the app
          </Link>
          <span className="inline-flex items-center rounded-lg px-2 py-3 text-sm text-slate-400">
            MIT licensed · self-hosted with Docker
          </span>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-slate-500">
          BuildFlow is an original project and is not affiliated with any
          commercial construction software vendor.
        </p>
      </main>
    </div>
  );
}
