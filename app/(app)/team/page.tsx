import { redirect } from "next/navigation";
import { requireSession, canManage } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { TeamManager } from "./team-manager";

export default async function TeamPage() {
  const session = await requireSession();
  if (!canManage(session)) redirect("/dashboard");

  const allowedRoles =
    session.user.role === "OWNER"
      ? (["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"] as const)
      : (["SUBCONTRACTOR", "CLIENT"] as const);

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite people to your company and control what they can do."
      />
      <TeamManager
        currentUserId={session.user.id}
        isOwner={session.user.role === "OWNER"}
        allowedRoles={[...allowedRoles]}
      />
    </div>
  );
}
