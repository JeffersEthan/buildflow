import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  getOwnClientRecord,
  requireApiSession,
  toErrorResponse,
} from "@/lib/auth-helpers";

const STATUSES: ProjectStatus[] = ["LEAD", "ACTIVE", "ON_HOLD", "COMPLETED"];

export async function GET(req: NextRequest) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;

    const status = req.nextUrl.searchParams.get("status");
    const where: Prisma.ProjectWhereInput = {
      companyId: session.user.companyId,
    };
    if (status && (STATUSES as string[]).includes(status)) {
      where.status = status as ProjectStatus;
    }
    if (session.user.role === "CLIENT") {
      const client = await getOwnClientRecord(session);
      where.clientId = client ? client.id : "__no_match__";
    }

    const projects = await db.project.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let clientId: string | null = body.clientId || null;
    if (clientId) {
      const client = await db.client.findFirst({
        where: { id: clientId, companyId: session.user.companyId },
      });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 400 });
      }
    }

    const project = await db.project.create({
      data: {
        companyId: session.user.companyId,
        name: body.name.trim(),
        address: body.address?.trim() || null,
        clientId,
        status: (body.status as ProjectStatus) ?? "LEAD",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        budget: body.budget ? new Prisma.Decimal(body.budget) : null,
        description: body.description?.trim() || null,
      },
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
