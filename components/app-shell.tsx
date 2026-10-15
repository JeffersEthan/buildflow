import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { cn } from "./ui";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"] },
  { href: "/projects", label: "Projects", roles: ["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"] },
  { href: "/schedule", label: "Schedule", roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"] },
  { href: "/clients", label: "Clients", roles: ["OWNER", "MANAGER"] },
  { href: "/team", label: "Team", roles: ["OWNER", "MANAGER"] },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 md:flex">
        <div className="px-5 pb-6 pt-6">
          <p className="text-lg font-bold tracking-tight text-white">
            BuildFlow
          </p>
          <p className="text-xs text-slate-400">Construction management</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate px-1 text-sm font-medium text-white">
            {user.name}
          </p>
          <p className="truncate px-1 text-xs text-slate-400">
            {user.email} · {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
          </p>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-gray-200 bg-white md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-base font-bold text-slate-900">BuildFlow</p>
            <nav className="flex gap-1 overflow-x-auto">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
