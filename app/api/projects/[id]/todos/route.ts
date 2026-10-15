import { NextRequest, NextResponse } from "next/server";
import { Prisma, TodoPriority, TodoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

const STATUSES: TodoStatus[] = ["OPEN", "IN_PROGRESS", "DONE"];
const PRIORITIES: TodoPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id } = await params;
    await requireProjectAccess(id, session);

    const status = req.nextUrl.searchParams.get("status");
    const where: Prisma.TodoWhereInput = { projectId: id };
    if (status && (STATUSES as string[]).includes(status)) {
      where.status = status as TodoStatus;
    }

    const todos = await db.todo.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json(todos);
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
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.priority && !(PRIORITIES as string[]).includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
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

    const todo = await db.todo.create({
      data: {
        projectId: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        status: (body.status as TodoStatus) ?? "OPEN",
        priority: (body.priority as TodoPriority) ?? "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedToId,
        createdById: session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
