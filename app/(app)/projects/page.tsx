import Link from "next/link";
import { Prisma, type ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  getOwnClientRecord,
  requireSession,
} from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LinkButton,
  PageHeader,
  cn,
  formatDate,
  prettyEnum,
  projectStatusTone,
} from "@/components/ui";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const { status } = await searchParams;
  const statusFilter = FILTERS.some((f) => f.value === status)
    ? (status as ProjectStatus | "")
    : "";

  const where: Prisma.ProjectWhereInput = { companyId: session.user.companyId };
  if (statusFilter) where.status = statusFilter;
  if (session.user.role === "CLIENT") {
    const client = await getOwnClientRecord(session);
    where.clientId = client ? client.id : "__no_match__";
  }

  const projects = await db.project.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Every job your company is tracking, from first bid to final walkthrough."
        actions={
          canManage(session) ? (
            <LinkButton href="/projects/new">New project</LinkButton>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={f.value ? `/projects?status=${f.value}` : "/projects"}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={
            statusFilter
              ? "Nothing matches this status filter. Try a different one."
              : "Create your first project to start tracking work."
          }
          action={
            canManage(session) && !statusFilter ? (
              <LinkButton href="/projects/new">New project</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full transition hover:shadow-md">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      {p.name}
                    </h3>
                    <Badge tone={projectStatusTone[p.status] ?? "gray"}>
                      {prettyEnum(p.status)}
                    </Badge>
                  </div>
                  {p.address ? (
                    <p className="mt-1 text-sm text-gray-500">{p.address}</p>
                  ) : null}
                  {p.client ? (
                    <p className="mt-1 text-sm text-gray-500">
                      Client: <span className="font-medium text-gray-700">{p.client.name}</span>
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-gray-500">
                    {formatDate(p.startDate)}
                    {p.startDate || p.endDate ? " – " : ""}
                    {formatDate(p.endDate)}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
