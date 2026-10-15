import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  requireApiSession,
  canManage,
  toErrorResponse,
} from "@/lib/auth-helpers";

/** List all clients with project counts and linked portal login. Staff only. */
export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const clients = await db.client.findMany({
      where: { companyId: session.user.companyId },
      include: {
        _count: { select: { projects: true } },
        user: { select: { email: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Create a client. Optionally also creates a portal login (CLIENT-role user)
 * linked to the client record. Staff only.
 */
export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await req.json().catch(() => null);
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const email =
      typeof data?.email === "string" && data.email.trim()
        ? data.email.trim()
        : null;
    const phone =
      typeof data?.phone === "string" && data.phone.trim()
        ? data.phone.trim()
        : null;
    const address =
      typeof data?.address === "string" && data.address.trim()
        ? data.address.trim()
        : null;

    let userId: string | null = null;
    if (data?.createLogin) {
      const loginEmail =
        typeof data?.loginEmail === "string" && data.loginEmail.trim()
          ? data.loginEmail.trim()
          : email;
      const loginPassword =
        typeof data?.loginPassword === "string" ? data.loginPassword : "";
      if (!loginEmail) {
        return NextResponse.json(
          { error: "An email is required to create a portal login" },
          { status: 400 }
        );
      }
      if (!loginPassword) {
        return NextResponse.json(
          { error: "A password is required to create a portal login" },
          { status: 400 }
        );
      }
      const existing = await db.user.findFirst({
        where: { companyId: session.user.companyId, email: loginEmail },
      });
      if (existing) {
        return NextResponse.json(
          { error: "That email is already used by another login" },
          { status: 409 }
        );
      }
      const user = await db.user.create({
        data: {
          companyId: session.user.companyId,
          email: loginEmail,
          passwordHash: await bcrypt.hash(loginPassword, 10),
          name,
          role: "CLIENT",
        },
      });
      userId = user.id;
    }

    const client = await db.client.create({
      data: {
        companyId: session.user.companyId,
        name,
        email,
        phone,
        address,
        userId,
      },
      include: {
        _count: { select: { projects: true } },
        user: { select: { email: true } },
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
