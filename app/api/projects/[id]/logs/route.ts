import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id } = await params;
    await requireProjectAccess(id, session);

    const logs = await db.dailyLog.findMany({
      where: { projectId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(logs);
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
    if (!body.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const workersOnSite =
      body.workersOnSite === undefined || body.workersOnSite === null || body.workersOnSite === ""
        ? null
        : Number.parseInt(String(body.workersOnSite), 10);
    if (workersOnSite !== null && Number.isNaN(workersOnSite)) {
      return NextResponse.json(
        { error: "Workers on site must be a number" },
        { status: 400 }
      );
    }

    const hoursWorked =
      body.hoursWorked === undefined || body.hoursWorked === null || body.hoursWorked === ""
        ? null
        : Number.parseFloat(String(body.hoursWorked));
    if (hoursWorked !== null && Number.isNaN(hoursWorked)) {
      return NextResponse.json(
        { error: "Hours worked must be a number" },
        { status: 400 }
      );
    }

    const log = await db.dailyLog.create({
      data: {
        projectId: id,
        date: new Date(body.date),
        weather: body.weather?.trim() || null,
        workersOnSite,
        hoursWorked,
        notes: body.notes?.trim() || null,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
