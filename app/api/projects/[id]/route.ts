import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

const STATUSES: ProjectStatus[] = ["LEAD", "ACTIVE", "ON_HOLD", "COMPLETED"];

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    const { id } = await params;
    const project = await requireProjectAccess(id, session);
    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await requireProjectAccess(id, session);

    const body = await req.json();
    if (body.status && !(STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.clientId) {
      const client = await db.client.findFirst({
        where: { id: body.clientId, companyId: session.user.companyId },
      });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 400 });
      }
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.address !== undefined) data.address = body.address?.trim() || null;
    if (body.clientId !== undefined)
      data.client = body.clientId
        ? { connect: { id: body.clientId } }
        : { disconnect: true };
    if (body.status !== undefined) data.status = body.status as ProjectStatus;
    if (body.startDate !== undefined)
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined)
      data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.budget !== undefined)
      data.budget = body.budget ? new Prisma.Decimal(body.budget) : null;
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;

    const project = await db.project.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { session, unauthorized } = await requireApiSession();
    if (!session) return unauthorized;
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await requireProjectAccess(id, session);
    await db.project.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
