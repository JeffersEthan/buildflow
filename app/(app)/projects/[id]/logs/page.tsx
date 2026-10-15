import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import { ProjectTabs } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui";
import { LogManager, type LogDto } from "./log-manager";

export default async function ProjectLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;

  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const logs = await db.dailyLog.findMany({
    where: { projectId: id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const dto: LogDto[] = logs.map((log) => ({
    id: log.id,
    date: log.date.toISOString(),
    weather: log.weather,
    workersOnSite: log.workersOnSite,
    hoursWorked: log.hoursWorked,
    notes: log.notes,
    createdBy: log.createdBy,
  }));

  return (
    <div>
      <PageHeader
        title={`${project.name} — Daily Logs`}
        description="Field reports from the job site, newest first."
      />
      <ProjectTabs projectId={project.id} role={session.user.role} />
      <LogManager projectId={project.id} logs={dto} />
    </div>
  );
}
