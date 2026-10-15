import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  canManage,
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import { ClientProjectView } from "@/components/client-portal";
import { ProjectTabs } from "@/components/project-tabs";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  formatDate,
  money,
  prettyEnum,
  projectStatusTone,
  scheduleStatusTone,
  todoStatusTone,
  priorityTone,
} from "@/components/ui";
import { EditProjectButton } from "./edit-project";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  if (session.user.role === "CLIENT") {
    return <ClientProjectView projectId={id} />;
  }

  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const [budgetTotals, scheduleItems, todos, logs, clients] = await Promise.all([
    db.budgetItem.aggregate({
      where: { projectId: id },
      _sum: { estimatedCost: true, actualCost: true },
    }),
    db.scheduleItem.findMany({
      where: { projectId: id, status: { not: "COMPLETED" } },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    db.todo.findMany({
      where: { projectId: id },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.dailyLog.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" },
      take: 3,
    }),
    canManage(session)
      ? db.client.findMany({
          where: { companyId: session.user.companyId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  const estimated = Number(budgetTotals._sum.estimatedCost ?? 0);
  const actual = Number(budgetTotals._sum.actualCost ?? 0);
  const budget = project.budget ? Number(project.budget) : null;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.address ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={projectStatusTone[project.status] ?? "gray"}>
              {prettyEnum(project.status)}
            </Badge>
            {canManage(session) ? (
              <EditProjectButton
                project={{
                  id: project.id,
                  name: project.name,
                  address: project.address,
                  status: project.status,
                  startDate: project.startDate?.toISOString().slice(0, 10) ?? null,
                  endDate: project.endDate?.toISOString().slice(0, 10) ?? null,
                  budget: project.budget ? String(project.budget) : null,
                  description: project.description,
                  clientId: project.clientId,
                }}
                clients={clients}
              />
            ) : null}
          </div>
        }
      />

      <ProjectTabs projectId={project.id} role={session.user.role} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Project details" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Client</dt>
                <dd className="font-medium text-gray-900">
                  {project.client?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium text-gray-900">
                  {prettyEnum(project.status)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Start date</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(project.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">End date</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(project.endDate)}
                </dd>
              </div>
            </dl>
            {project.description ? (
              <p className="mt-4 text-sm text-gray-600">{project.description}</p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Budget"
            subtitle="Planned budget against tracked costs."
            actions={
              <LinkButton
                href={`/projects/${project.id}/budget`}
                variant="secondary"
              >
                Budget details
              </LinkButton>
            }
          />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Project budget</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {money(project.budget)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Estimated costs</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {money(estimated)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Actual costs</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {money(actual)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Remaining</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {budget !== null ? money(budget - actual) : "—"}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming schedule"
            subtitle="Next open schedule items."
            actions={
              <LinkButton
                href={`/projects/${project.id}/schedule`}
                variant="secondary"
              >
                Full schedule
              </LinkButton>
            }
          />
          <CardBody>
            {scheduleItems.length === 0 ? (
              <EmptyState title="No upcoming items" description="The schedule is clear or everything is complete." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {scheduleItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(item.startDate)} – {formatDate(item.endDate)}
                        {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}
                      </p>
                    </div>
                    <Badge tone={scheduleStatusTone[item.status] ?? "gray"}>
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
            title="Recent to-dos"
            subtitle="Newest tasks on this project."
            actions={
              <LinkButton
                href={`/projects/${project.id}/todos`}
                variant="secondary"
              >
                All to-dos
              </LinkButton>
            }
          />
          <CardBody>
            {todos.length === 0 ? (
              <EmptyState title="No to-dos yet" description="Add the first task to keep the crew on track." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {todos.map((todo) => (
                  <li key={todo.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {todo.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {todo.dueDate ? `Due ${formatDate(todo.dueDate)}` : "No due date"}
                        {todo.assignedTo?.name ? ` · ${todo.assignedTo.name}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge tone={priorityTone[todo.priority] ?? "gray"}>
                        {prettyEnum(todo.priority)}
                      </Badge>
                      <Badge tone={todoStatusTone[todo.status] ?? "gray"}>
                        {prettyEnum(todo.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent daily logs"
            subtitle="The latest field reports."
            actions={
              <LinkButton
                href={`/projects/${project.id}/logs`}
                variant="secondary"
              >
                All logs
              </LinkButton>
            }
          />
          <CardBody>
            {logs.length === 0 ? (
              <EmptyState title="No daily logs yet" description="Log the first day of work on the job site." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <li key={log.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatDate(log.date)}
                      </span>
                      {log.weather ? (
                        <span className="text-gray-500">{log.weather}</span>
                      ) : null}
                      {log.workersOnSite !== null && log.workersOnSite !== undefined ? (
                        <span className="text-gray-500">
                          {log.workersOnSite} workers
                        </span>
                      ) : null}
                      {log.hoursWorked !== null && log.hoursWorked !== undefined ? (
                        <span className="text-gray-500">
                          {log.hoursWorked} hrs
                        </span>
                      ) : null}
                    </div>
                    {log.notes ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {log.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Need to reach the client?{" "}
        <Link href={`/projects/${project.id}/messages`} className="font-medium text-blue-600 hover:underline">
          Open project messages
        </Link>
        .
      </p>
    </div>
  );
}
