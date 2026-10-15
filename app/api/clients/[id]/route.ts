import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireApiSession,
  canManage,
  toErrorResponse,
  type AppSession,
} from "@/lib/auth-helpers";

async function getClient(id: string, session: AppSession) {
  const client = await db.client.findFirst({
    where: { id, companyId: session.user.companyId },
    include: {
      _count: { select: { projects: true } },
      user: { select: { email: true } },
    },
  });
  if (!client) {
    throw Object.assign(new Error("Client not found"), { status: 404 });
  }
  return client;
}

/** Get one client. Staff only. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const client = await getClient(id, session);
    return NextResponse.json(client);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Update a client. Staff only. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await getClient(id, session);
    const data = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const update: Record<string, string | null> = {};
    for (const field of ["name", "email", "phone", "address"] as const) {
      if (field in data) {
        const value = data[field];
        update[field] =
          typeof value === "string" && value.trim() ? value.trim() : null;
      }
    }
    if (update["name"] === null) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    const client = await db.client.update({
      where: { id },
      data: update,
      include: {
        _count: { select: { projects: true } },
        user: { select: { email: true } },
      },
    });
    return NextResponse.json(client);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Delete a client. The linked portal login account is kept; it is just
 * unlinked from the deleted client record. Staff only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await getClient(id, session);
    await db.client.update({ where: { id }, data: { userId: null } });
    await db.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
