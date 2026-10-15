import { NextRequest, NextResponse } from "next/server";
import { Prisma, ScheduleItemStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

const STATUSES: ScheduleItemStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
];

type Params = { params: Promise<{ id: string; itemId: string }> };

async function findItem(projectId: string, itemId: string) {
  return db.scheduleItem.findFirst({
    where: { id: itemId, projectId },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);

    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Schedule item not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(item);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (session.user.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);

    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Schedule item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.assignedToId) {
      const user = await db.user.findFirst({
        where: { id: body.assignedToId, companyId: session.user.companyId },
      });
      if (!user) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
    }

    const data: Prisma.ScheduleItemUpdateInput = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (body.status !== undefined)
      data.status = body.status as ScheduleItemStatus;
    if (body.assignedToId !== undefined)
      data.assignedTo = body.assignedToId
        ? { connect: { id: body.assignedToId } }
        : { disconnect: true };

    const updated = await db.scheduleItem.update({
      where: { id: itemId },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (session.user.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);

    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Schedule item not found" },
        { status: 404 }
      );
    }
    await db.scheduleItem.delete({ where: { id: itemId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
