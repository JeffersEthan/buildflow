import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

function moneyField(value: unknown, field: string): Prisma.Decimal {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 });
  }
  return new Prisma.Decimal(n);
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
    const items = await db.budgetItem.findMany({
      where: { projectId: id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ items });
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
    const category = String(body.category ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!category || !name) {
      return NextResponse.json(
        { error: "Category and name are required" },
        { status: 400 }
      );
    }
    if (body.estimatedCost === undefined || body.estimatedCost === null) {
      return NextResponse.json(
        { error: "estimatedCost is required" },
        { status: 400 }
      );
    }
    const item = await db.budgetItem.create({
      data: {
        projectId: id,
        category,
        name,
        estimatedCost: moneyField(body.estimatedCost, "estimatedCost"),
        actualCost:
          body.actualCost === undefined || body.actualCost === null
            ? new Prisma.Decimal(0)
            : moneyField(body.actualCost, "actualCost"),
        notes: String(body.notes ?? "").trim() || null,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
