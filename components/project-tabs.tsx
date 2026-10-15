"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";
import type { Role } from "@prisma/client";

interface Tab {
  suffix: string;
  label: string;
  exact?: boolean;
  roles?: Role[];
}

const TABS: Tab[] = [
  { suffix: "", label: "Overview", exact: true },
  {
    suffix: "/schedule",
    label: "Schedule",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  {
    suffix: "/todos",
    label: "To-Dos",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  {
    suffix: "/logs",
    label: "Daily Logs",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  { suffix: "/files", label: "Files", roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"] },
  {
    suffix: "/budget",
    label: "Budget",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  {
    suffix: "/estimates",
    label: "Estimates",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  {
    suffix: "/change-orders",
    label: "Change Orders",
    roles: ["OWNER", "MANAGER", "SUBCONTRACTOR"],
  },
  { suffix: "/selections", label: "Selections" },
  { suffix: "/messages", label: "Messages" },
];

/** Tab navigation shared by every project detail page. */
export function ProjectTabs({
  projectId,
  role,
}: {
  projectId: string;
  role: Role;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = TABS.filter((t) => !t.roles || t.roles.includes(role));

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.suffix || "overview"}
            href={href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
