import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  formatDate,
  prettyEnum,
  scheduleStatusTone,
} from "@/components/ui";

export default async function DashboardPage() {
  const session = await requireSession();
  const { companyId, role, id: userId } = session.user;
  const isClient = role === "CLIENT";

  // Clients only ever see their own linked projects.
  let projectFilter: { id: { in: string[] } } | undefined;
  if (isClient) {
    const ownProjects = await db.project.findMany({
      where: { companyId, client: { userId } },
      select: { id: true },
    });
    projectFilter = { id: { in: ownProjects.map((p) => p.id) } };
  }

  const itemWhere = projectFilter
    ? { projectId: projectFilter.id }
    : { project: { companyId } };

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [activeProjects, openTodos, dueSoon, pendingSelections, upcoming, logs] =
    await Promise.all([
      db.project.count({
        where: { companyId, status: "ACTIVE", ...(projectFilter ?? {}) },
      }),
      db.todo.count({
        where: { ...itemWhere, status: { not: "DONE" } },
      }),
      db.scheduleItem.count({
        where: {
          ...itemWhere,
          startDate: { gte: now, lte: weekOut },
        },
      }),
      db.selection.count({
        where: { ...itemWhere, status: "PENDING" },
      }),
      db.scheduleItem.findMany({
        where: {
          ...itemWhere,
          startDate: { gte: now, lte: weekOut },
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { startDate: "asc" },
        take: 8,
      }),
      db.dailyLog.findMany({
        where: itemWhere,
        include: {
          project: { select: { id: true, name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Active projects", value: activeProjects },
    { label: "Open to-dos", value: openTodos },
    { label: "Due in next 7 days", value: dueSoon },
    { label: "Pending selections", value: pendingSelections },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.user.name.split(" ")[0]}`}
        description={
          isClient
            ? "A snapshot of your project and anything waiting on you."
            : "A snapshot of the whole operation — what's moving and what's waiting."
        }
        actions={
          !isClient ? (
            <LinkButton href="/clients" variant="secondary">
              Manage clients
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Upcoming schedule"
            subtitle="Starting in the next 7 days"
          />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState
                title="Nothing on the calendar"
                description="No schedule items start in the next 7 days."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.project.name} · {formatDate(item.startDate)}
                        {" – "}
                        {formatDate(item.endDate)}
                      </p>
                    </div>
                    <Badge tone={scheduleStatusTone[item.status]}>
                      {prettyEnum(item.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent daily logs"
            subtitle="Latest field updates"
          />
          <CardBody>
            {logs.length === 0 ? (
              <EmptyState
                title="No logs yet"
                description="Daily logs from the field will show up here."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {log.project.name}
                      </p>
                      <p className="shrink-0 text-xs text-gray-500">
                        {formatDate(log.date)} · {log.createdBy.name}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {log.notes ?? "No notes recorded."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
