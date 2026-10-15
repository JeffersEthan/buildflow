import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

const CHANGE_ORDER_STATUSES = ["DRAFT", "PENDING", "APPROVED", "DECLINED"] as const;

function moneyField(value: unknown, field: string): Prisma.Decimal {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 });
  }
  return new Prisma.Decimal(n);
}

async function loadChangeOrder(id: string, coId: string) {
  const changeOrder = await db.changeOrder.findFirst({
    where: { id: coId, projectId: id },
  });
  if (!changeOrder)
    throw Object.assign(new Error("Change order not found"), { status: 404 });
  return changeOrder;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, coId } = await params;
    await requireProjectAccess(id, session);
    const changeOrder = await loadChangeOrder(id, coId);
    return NextResponse.json({ changeOrder });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, coId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadChangeOrder(id, coId);
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title)
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      data.title = title;
    }
    if (body.number !== undefined) {
      const number = String(body.number).trim();
      if (!number)
        return NextResponse.json(
          { error: "Number cannot be empty" },
          { status: 400 }
        );
      const taken = await db.changeOrder.findFirst({
        where: { projectId: id, number, NOT: { id: coId } },
        select: { id: true },
      });
      if (taken)
        return NextResponse.json(
          { error: `Change order number ${number} is already used` },
          { status: 409 }
        );
      data.number = number;
    }
    if (body.description !== undefined)
      data.description = String(body.description ?? "").trim() || null;
    if (body.amount !== undefined && body.amount !== null)
      data.amount = moneyField(body.amount, "amount");
    if (body.status !== undefined) {
      if (!CHANGE_ORDER_STATUSES.includes(body.status))
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = body.status;
    }

    const changeOrder = await db.changeOrder.update({
      where: { id: coId },
      data,
    });
    return NextResponse.json({ changeOrder });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, coId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadChangeOrder(id, coId);
    await db.changeOrder.delete({ where: { id: coId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
