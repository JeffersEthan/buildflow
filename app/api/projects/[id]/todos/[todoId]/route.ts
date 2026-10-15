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

type Params = { params: Promise<{ id: string; todoId: string }> };

async function findTodo(projectId: string, todoId: string) {
  return db.todo.findFirst({
    where: { id: todoId, projectId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id, todoId } = await params;
    await requireProjectAccess(id, session);

    const todo = await findTodo(id, todoId);
    if (!todo) {
      return NextResponse.json({ error: "To-do not found" }, { status: 404 });
    }
    return NextResponse.json(todo);
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
    const { id, todoId } = await params;
    await requireProjectAccess(id, session);

    const todo = await findTodo(id, todoId);
    if (!todo) {
      return NextResponse.json({ error: "To-do not found" }, { status: 404 });
    }

    const body = await req.json();
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.priority && !(PRIORITIES as string[]).includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (body.assignedToId) {
      const user = await db.user.findFirst({
        where: { id: body.assignedToId, companyId: session.user.companyId },
      });
      if (!user) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
    }

    const data: Prisma.TodoUpdateInput = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;
    if (body.status !== undefined) data.status = body.status as TodoStatus;
    if (body.priority !== undefined)
      data.priority = body.priority as TodoPriority;
    if (body.dueDate !== undefined)
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assignedToId !== undefined)
      data.assignedTo = body.assignedToId
        ? { connect: { id: body.assignedToId } }
        : { disconnect: true };

    const updated = await db.todo.update({
      where: { id: todoId },
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
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
    const { id, todoId } = await params;
    await requireProjectAccess(id, session);

    const todo = await findTodo(id, todoId);
    if (!todo) {
      return NextResponse.json({ error: "To-do not found" }, { status: 404 });
    }
    await db.todo.delete({ where: { id: todoId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
