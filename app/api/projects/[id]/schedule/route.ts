import { NextRequest, NextResponse } from "next/server";
import { ScheduleItemStatus } from "@prisma/client";
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

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id } = await params;
    await requireProjectAccess(id, session);

    const items = await db.scheduleItem.findMany({
      where: { projectId: id },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(items);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (session.user.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await requireProjectAccess(id, session);

    const body = await req.json();
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let assignedToId: string | null = body.assignedToId || null;
    if (assignedToId) {
      const user = await db.user.findFirst({
        where: { id: assignedToId, companyId: session.user.companyId },
      });
      if (!user) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
    }

    const item = await db.scheduleItem.create({
      data: {
        projectId: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status: (body.status as ScheduleItemStatus) ?? "SCHEDULED",
        assignedToId,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
