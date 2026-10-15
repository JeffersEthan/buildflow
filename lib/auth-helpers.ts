import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "./db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}

export interface AppSession {
  user: SessionUser;
}

/** Server-component helper: redirects to /login when not signed in. */
export async function requireSession(): Promise<AppSession> {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.id) redirect("/login");
  return { user };
}

/** Route-handler helper: returns a 401 response when not signed in. */
export async function requireApiSession(): Promise<
  | { session: AppSession; unauthorized: null }
  | { session: null; unauthorized: NextResponse }
> {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.id) {
    return {
      session: null,
      unauthorized: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { session: { user }, unauthorized: null };
}

/** Owners and managers can administer projects, finances, team and clients. */
export function canManage(session: AppSession): boolean {
  return session.user.role === "OWNER" || session.user.role === "MANAGER";
}

/** The client record linked to the signed-in user, if they are a client. */
export async function getOwnClientRecord(session: AppSession) {
  if (session.user.role !== "CLIENT") return null;
  return db.client.findFirst({
    where: { userId: session.user.id, companyId: session.user.companyId },
  });
}

export type AccessibleProject = NonNullable<
  Awaited<ReturnType<typeof getAccessibleProject>>
>;

/**
 * Loads a project if the signed-in user may see it, otherwise null.
 * - Staff (OWNER/MANAGER/SUBCONTRACTOR): any project in their company.
 * - Clients: only projects belonging to their linked client record.
 */
export async function getAccessibleProject(
  projectId: string,
  session: AppSession
) {
  const project = await db.project.findFirst({
    where: { id: projectId, companyId: session.user.companyId },
    include: {
      client: { select: { id: true, name: true, userId: true } },
    },
  });
  if (!project) return null;
  if (session.user.role === "CLIENT") {
    if (!project.client || project.client.userId !== session.user.id) {
      return null;
    }
  }
  return project;
}

/** Same as getAccessibleProject but throws a 404-style error for API use. */
export async function requireProjectAccess(
  projectId: string,
  session: AppSession
) {
  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    throw Object.assign(new Error("Project not found"), { status: 404 });
  }
  return project;
}

/** Converts a thrown { status } error into a JSON response. */
export function toErrorResponse(err: unknown): NextResponse {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status) || 500
      : 500;
  const message =
    err instanceof Error && status !== 500 ? err.message : "Server error";
  return NextResponse.json({ error: message }, { status });
}
