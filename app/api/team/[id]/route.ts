import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  canManage,
  toErrorResponse,
  type AppSession,
} from "@/lib/auth-helpers";

const ROLES: Role[] = ["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"];

async function getMember(id: string, session: AppSession) {
  const user = await db.user.findFirst({
    where: { id, companyId: session.user.companyId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    throw Object.assign(new Error("Team member not found"), { status: 404 });
  }
  return user;
}

/**
 * Change a team member's role. Staff only; only an OWNER may change roles,
 * and nobody may change their own account.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }
    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only an owner can change roles" },
        { status: 403 }
      );
    }
    await getMember(id, session);

    const data = await req.json().catch(() => null);
    const role = data?.role as Role | undefined;
    if (!role || !ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Remove a team member. Owner only; nobody may delete their own account. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only an owner can remove team members" },
        { status: 403 }
      );
    }
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }
    await getMember(id, session);
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
