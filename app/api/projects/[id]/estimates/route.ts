import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

const ESTIMATE_STATUSES = ["DRAFT", "SENT", "APPROVED", "DECLINED"] as const;

function moneyField(value: unknown, field: string): Prisma.Decimal {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 });
  }
  return new Prisma.Decimal(n);
}

/** Sum of qty x unitPrice for an estimate's lines. */
export function estimateTotal(
  lines: Array<{ quantity: number; unitPrice: Prisma.Decimal | string | number }>
): number {
  return lines.reduce(
    (sum, l) => sum + l.quantity * Number(l.unitPrice),
    0
  );
}

/** Next free "EST-001"-style number for a project. */
export async function nextEstimateNumber(projectId: string): Promise<string> {
  const existing = await db.estimate.findMany({
    where: { projectId },
    select: { number: true },
  });
  let max = 0;
  for (const row of existing) {
    const m = /^EST-(\d+)$/.exec(row.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `EST-${String(max + 1).padStart(3, "0")}`;
}

function parseLines(
  lines: unknown
): Array<{ description: string; quantity: number; unitPrice: Prisma.Decimal; position: number }> {
  if (!Array.isArray(lines)) {
    throw Object.assign(new Error("lines must be an array"), { status: 400 });
  }
  return lines.map((raw, i) => {
    const line = raw as Record<string, unknown>;
    const description = String(line.description ?? "").trim();
    if (!description) {
      throw Object.assign(new Error(`Line ${i + 1}: description is required`), {
        status: 400,
      });
    }
    if (line.unitPrice === undefined || line.unitPrice === null) {
      throw Object.assign(new Error(`Line ${i + 1}: unitPrice is required`), {
        status: 400,
      });
    }
    const quantity =
      line.quantity === undefined || line.quantity === null
        ? 1
        : Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw Object.assign(new Error(`Line ${i + 1}: invalid quantity`), {
        status: 400,
      });
    }
    return {
      description,
      quantity,
      unitPrice: moneyField(line.unitPrice, `line ${i + 1} unitPrice`),
      position: i,
    };
  });
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
    const estimates = await db.estimate.findMany({
      where: { projectId: id },
      include: {
        _count: { select: { lines: true } },
        lines: { orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    const withTotals = estimates.map((e) => ({
      ...e,
      total: estimateTotal(e.lines),
    }));
    return NextResponse.json({ estimates: withTotals });
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
    const status = body.status ?? "DRAFT";
    if (!ESTIMATE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const number = body.number
      ? String(body.number).trim()
      : await nextEstimateNumber(id);
    if (!number) {
      return NextResponse.json(
        { error: "Number is required" },
        { status: 400 }
      );
    }
    const taken = await db.estimate.findFirst({
      where: { projectId: id, number },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: `Estimate number ${number} is already used` },
        { status: 409 }
      );
    }
    const lines = parseLines(body.lines ?? []);
    let validUntil: Date | null = null;
    if (body.validUntil) {
      validUntil = new Date(body.validUntil);
      if (Number.isNaN(validUntil.getTime()))
        return NextResponse.json(
          { error: "Invalid validUntil date" },
          { status: 400 }
        );
    }
    const estimate = await db.estimate.create({
      data: {
        projectId: id,
        number,
        title,
        status,
        validUntil,
        notes: String(body.notes ?? "").trim() || null,
        lines: { create: lines },
      },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json(
      { estimate: { ...estimate, total: estimateTotal(estimate.lines) } },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
