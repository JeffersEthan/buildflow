import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";

/** List all messages on a project, oldest first. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    const messages = await db.message.findMany({
      where: { projectId: id },
      include: { sender: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Post a message to the project thread. The sender is the signed-in user. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);

    const data = await req.json().catch(() => null);
    const body = typeof data?.body === "string" ? data.body.trim() : "";
    if (!body) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    const message = await db.message.create({
      data: { projectId: id, senderId: session.user.id, body },
      include: { sender: { select: { name: true, role: true } } },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
