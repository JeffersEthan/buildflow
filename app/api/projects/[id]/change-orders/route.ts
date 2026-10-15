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

/** Next free "CO-001"-style number for a project. */
async function nextChangeOrderNumber(projectId: string): Promise<string> {
  const existing = await db.changeOrder.findMany({
    where: { projectId },
    select: { number: true },
  });
  let max = 0;
  for (const row of existing) {
    const m = /^CO-(\d+)$/.exec(row.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `CO-${String(max + 1).padStart(3, "0")}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    const changeOrders = await db.changeOrder.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ changeOrders });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }
    const status = body.status ?? "DRAFT";
    if (!CHANGE_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const number = body.number
      ? String(body.number).trim()
      : await nextChangeOrderNumber(id);
    if (!number) {
      return NextResponse.json(
        { error: "Number is required" },
        { status: 400 }
      );
    }
    const taken = await db.changeOrder.findFirst({
      where: { projectId: id, number },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: `Change order number ${number} is already used` },
        { status: 409 }
      );
    }
    const changeOrder = await db.changeOrder.create({
      data: {
        projectId: id,
        number,
        title,
        description: String(body.description ?? "").trim() || null,
        amount: moneyField(body.amount, "amount"),
        status,
      },
    });
    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
