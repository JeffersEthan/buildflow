import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "./project-form";

export default async function NewProjectPage() {
  const session = await requireSession();
  if (!canManage(session)) redirect("/projects");

  const clients = await db.client.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="New project"
        description="Set up a new job with its client, timeline, and budget."
      />
      <ProjectForm clients={clients} />
    </div>
  );
}
