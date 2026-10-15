import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui";
import { ScheduleManager, type ScheduleItemDto } from "./schedule-manager";

export default async function ProjectSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;

  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const [items, users] = await Promise.all([
    db.scheduleItem.findMany({
      where: { projectId: id },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
    db.user.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const dto: ScheduleItemDto[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    startDate: item.startDate.toISOString(),
    endDate: item.endDate.toISOString(),
    status: item.status,
    assignedTo: item.assignedTo,
  }));

  return (
    <div>
      <PageHeader
        title={`${project.name} — Schedule`}
        description="The full timeline for this project, earliest first."
      />
      <ProjectTabs projectId={project.id} role={session.user.role} />
      <ScheduleManager projectId={project.id} items={dto} users={users} />
    </div>
  );
}
