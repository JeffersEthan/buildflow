import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, getAccessibleProject } from "@/lib/auth-helpers";
import { ProjectTabs } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui";
import { SelectionList } from "./selection-list";

export default async function ProjectSelectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const selections = await db.selection.findMany({
    where: { projectId: id },
    include: { decidedBy: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Prisma Decimal/Date values don't cross the server/client boundary cleanly,
  // so normalize before handing the list to the interactive components.
  const serialized = JSON.parse(JSON.stringify(selections));

  const pending = selections.filter((s) => s.status === "PENDING").length;
  const isStaff = session.user.role === "OWNER" || session.user.role === "MANAGER";

  return (
    <div>
      <PageHeader
        title="Selections"
        description={
          isStaff
            ? "Collect decisions on materials, fixtures, and finishes — clients approve or decline each item."
            : pending > 0
              ? `${pending} item${pending === 1 ? "" : "s"} waiting on your decision.`
              : "Your decisions on materials, fixtures, and finishes."
        }
      />
      <ProjectTabs projectId={id} role={session.user.role} />
      <SelectionList
        projectId={id}
        selections={serialized}
        isStaff={isStaff}
      />
    </div>
  );
}
