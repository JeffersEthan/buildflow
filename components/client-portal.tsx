import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, getAccessibleProject } from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  formatDate,
  money,
  projectStatusTone,
  prettyEnum,
} from "@/components/ui";

/**
 * Simplified read-mostly project view for CLIENT-role users.
 *
 * NOTE: This is a minimal starter implementation. It is owned by the
 * client-portal module and will be replaced with the full version
 * (schedule read-only, selections approve/decline, messages, files,
 * estimates). The export signature must stay stable:
 *   ClientProjectView({ projectId }: { projectId: string })
 */
export async function ClientProjectView({
  projectId,
}: {
  projectId: string;
}) {
  const session = await requireSession();
  const project = await getAccessibleProject(projectId, session);
  if (!project) notFound();

  const schedule = await db.scheduleItem.findMany({
    where: { projectId },
    orderBy: { startDate: "asc" },
    take: 10,
  });

  return (
    <div>
      <PageHeader
        title={project.name}
        description="Your project portal — progress, upcoming work, and open items."
      />
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Project details" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge tone={projectStatusTone[project.status]}>
                    {prettyEnum(project.status)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="mt-1 font-medium">{project.address ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Start</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(project.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Target completion</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(project.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Budget</dt>
                <dd className="mt-1 font-medium">{money(project.budget)}</dd>
              </div>
            </dl>
            {project.description ? (
              <p className="mt-4 text-sm text-gray-600">{project.description}</p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming work" />
          <CardBody>
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500">
                No scheduled items yet — check back soon.
              </p>
            ) : (
              <ul className="space-y-3">
                {schedule.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-gray-500">
                      {formatDate(item.startDate)} – {formatDate(item.endDate)}
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
