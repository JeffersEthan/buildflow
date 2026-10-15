import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

function moneyField(value: unknown, field: string): Prisma.Decimal {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 });
  }
  return new Prisma.Decimal(n);
}

async function loadItem(id: string, itemId: string) {
  const item = await db.budgetItem.findFirst({
    where: { id: itemId, projectId: id },
  });
  if (!item) throw Object.assign(new Error("Budget item not found"), { status: 404 });
  return item;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);
    const item = await loadItem(id, itemId);
    return NextResponse.json({ item });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadItem(id, itemId);
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category)
        return NextResponse.json(
          { error: "Category cannot be empty" },
          { status: 400 }
        );
      data.category = category;
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name)
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      data.name = name;
    }
    if (body.estimatedCost !== undefined && body.estimatedCost !== null)
      data.estimatedCost = moneyField(body.estimatedCost, "estimatedCost");
    if (body.actualCost !== undefined && body.actualCost !== null)
      data.actualCost = moneyField(body.actualCost, "actualCost");
    if (body.notes !== undefined)
      data.notes = String(body.notes ?? "").trim() || null;
    const item = await db.budgetItem.update({
      where: { id: itemId },
      data,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, itemId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadItem(id, itemId);
    await db.budgetItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
