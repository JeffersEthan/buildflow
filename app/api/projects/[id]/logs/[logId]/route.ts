import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string; logId: string }> };

async function findLog(projectId: string, logId: string) {
  return db.dailyLog.findFirst({
    where: { id: logId, projectId },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id, logId } = await params;
    await requireProjectAccess(id, session);

    const log = await findLog(id, logId);
    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    return NextResponse.json(log);
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
    const { id, logId } = await params;
    await requireProjectAccess(id, session);

    const log = await findLog(id, logId);
    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: Prisma.DailyLogUpdateInput = {};
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.weather !== undefined) data.weather = body.weather?.trim() || null;
    if (body.workersOnSite !== undefined) {
      const n =
        body.workersOnSite === null || body.workersOnSite === ""
          ? null
          : Number.parseInt(String(body.workersOnSite), 10);
      if (n !== null && Number.isNaN(n)) {
        return NextResponse.json(
          { error: "Workers on site must be a number" },
          { status: 400 }
        );
      }
      data.workersOnSite = n;
    }
    if (body.hoursWorked !== undefined) {
      const n =
        body.hoursWorked === null || body.hoursWorked === ""
          ? null
          : Number.parseFloat(String(body.hoursWorked));
      if (n !== null && Number.isNaN(n)) {
        return NextResponse.json(
          { error: "Hours worked must be a number" },
          { status: 400 }
        );
      }
      data.hoursWorked = n;
    }
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    const updated = await db.dailyLog.update({
      where: { id: logId },
      data,
      include: { createdBy: { select: { id: true, name: true } } },
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
    const { id, logId } = await params;
    await requireProjectAccess(id, session);

    const log = await findLog(id, logId);
    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    await db.dailyLog.delete({ where: { id: logId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
