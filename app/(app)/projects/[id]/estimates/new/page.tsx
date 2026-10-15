import { redirect } from "next/navigation";
import {
  canManage,
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import NewEstimateForm from "./new-estimate-form";

export default async function NewEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;
  const project = await getAccessibleProject(id, session);
  if (!project) redirect("/projects");
  if (!canManage(session)) redirect(`/projects/${id}/estimates`);
  return <NewEstimateForm projectId={id} role={session.user.role} />;
}
