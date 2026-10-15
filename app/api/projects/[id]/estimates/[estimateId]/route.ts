import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";
import { estimateTotal } from "../route";

const ESTIMATE_STATUSES = ["DRAFT", "SENT", "APPROVED", "DECLINED"] as const;

function moneyField(value: unknown, field: string): Prisma.Decimal {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 });
  }
  return new Prisma.Decimal(n);
}

async function loadEstimate(id: string, estimateId: string) {
  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, projectId: id },
  });
  if (!estimate)
    throw Object.assign(new Error("Estimate not found"), { status: 404 });
  return estimate;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, estimateId } = await params;
    await requireProjectAccess(id, session);
    const estimate = await db.estimate.findFirst({
      where: { id: estimateId, projectId: id },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    if (!estimate)
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    return NextResponse.json({
      estimate: { ...estimate, total: estimateTotal(estimate.lines) },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, estimateId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadEstimate(id, estimateId);
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
      const taken = await db.estimate.findFirst({
        where: { projectId: id, number, NOT: { id: estimateId } },
        select: { id: true },
      });
      if (taken)
        return NextResponse.json(
          { error: `Estimate number ${number} is already used` },
          { status: 409 }
        );
      data.number = number;
    }
    if (body.status !== undefined) {
      if (!ESTIMATE_STATUSES.includes(body.status))
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = body.status;
    }
    if (body.validUntil !== undefined) {
      if (!body.validUntil) {
        data.validUntil = null;
      } else {
        const d = new Date(body.validUntil);
        if (Number.isNaN(d.getTime()))
          return NextResponse.json(
            { error: "Invalid validUntil date" },
            { status: 400 }
          );
        data.validUntil = d;
      }
    }
    if (body.notes !== undefined)
      data.notes = String(body.notes ?? "").trim() || null;

    let replacedLines:
      | Array<{
          estimateId: string;
          description: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
          position: number;
        }>
      | null = null;

    if (body.lines !== undefined) {
      if (!Array.isArray(body.lines))
        return NextResponse.json(
          { error: "lines must be an array" },
          { status: 400 }
        );
      replacedLines = body.lines.map((raw: unknown, i: number) => {
        const line = raw as Record<string, unknown>;
        const description = String(line.description ?? "").trim();
        if (!description)
          throw Object.assign(
            new Error(`Line ${i + 1}: description is required`),
            { status: 400 }
          );
        if (line.unitPrice === undefined || line.unitPrice === null)
          throw Object.assign(
            new Error(`Line ${i + 1}: unitPrice is required`),
            { status: 400 }
          );
        const quantity =
          line.quantity === undefined || line.quantity === null
            ? 1
            : Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity < 0)
          throw Object.assign(new Error(`Line ${i + 1}: invalid quantity`), {
            status: 400,
          });
        return {
          estimateId,
          description,
          quantity,
          unitPrice: moneyField(line.unitPrice, `line ${i + 1} unitPrice`),
          position: i,
        };
      });
    }

    await db.$transaction(async (tx) => {
      await tx.estimate.update({ where: { id: estimateId }, data });
      if (replacedLines !== null) {
        await tx.estimateLine.deleteMany({ where: { estimateId } });
        if (replacedLines.length > 0) {
          await tx.estimateLine.createMany({ data: replacedLines });
        }
      }
    });
    const estimate = await db.estimate.findUniqueOrThrow({
      where: { id: estimateId },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json({
      estimate: { ...estimate, total: estimateTotal(estimate.lines) },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, estimateId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await loadEstimate(id, estimateId);
    await db.estimate.delete({ where: { id: estimateId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
