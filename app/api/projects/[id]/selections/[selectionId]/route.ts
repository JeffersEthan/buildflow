import { NextRequest, NextResponse } from "next/server";
import type { SelectionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  canManage,
  toErrorResponse,
  type AppSession,
} from "@/lib/auth-helpers";

async function getSelection(
  projectId: string,
  selectionId: string,
  session: AppSession
) {
  await requireProjectAccess(projectId, session);
  const selection = await db.selection.findFirst({
    where: { id: selectionId, projectId },
    include: { decidedBy: { select: { name: true } } },
  });
  if (!selection) {
    throw Object.assign(new Error("Selection not found"), { status: 404 });
  }
  return selection;
}

const STAFF_FIELDS = ["category", "title", "description", "status"] as const;
const DECISION_STATUSES: SelectionStatus[] = ["APPROVED", "DECLINED"];

/** Get one selection. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; selectionId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, selectionId } = await params;
    const selection = await getSelection(id, selectionId, session);
    return NextResponse.json(selection);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Update a selection.
 * - Staff (OWNER/MANAGER): may change any field.
 * - Clients: may ONLY set status to APPROVED or DECLINED (records their
 *   decision). Any other field from a client is rejected with 403.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; selectionId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, selectionId } = await params;
    await getSelection(id, selectionId, session);
    const data = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (canManage(session)) {
      const update: Record<string, unknown> = {};
      for (const field of STAFF_FIELDS) {
        if (field in data) update[field] = data[field];
      }
      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      if ("status" in update) {
        const status = update["status"] as SelectionStatus;
        if (DECISION_STATUSES.includes(status)) {
          update["decidedById"] = session.user.id;
          update["decidedAt"] = new Date();
        } else if (status === "PENDING") {
          update["decidedById"] = null;
          update["decidedAt"] = null;
        }
      }
      const selection = await db.selection.update({
        where: { id: selectionId },
        data: update,
        include: { decidedBy: { select: { name: true } } },
      });
      return NextResponse.json(selection);
    }

    // Client path: only an approve/decline decision is allowed.
    const keys = Object.keys(data);
    const status = data["status"];
    if (
      keys.length !== 1 ||
      keys[0] !== "status" ||
      !DECISION_STATUSES.includes(status as SelectionStatus)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const selection = await db.selection.update({
      where: { id: selectionId },
      data: {
        status: status as SelectionStatus,
        decidedById: session.user.id,
        decidedAt: new Date(),
      },
      include: { decidedBy: { select: { name: true } } },
    });
    return NextResponse.json(selection);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Delete a selection. Staff (OWNER/MANAGER) only. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; selectionId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, selectionId } = await params;
    await getSelection(id, selectionId, session);
    await db.selection.delete({ where: { id: selectionId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
