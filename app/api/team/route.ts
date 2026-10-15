import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import {
  requireApiSession,
  canManage,
  toErrorResponse,
} from "@/lib/auth-helpers";

const ROLES: Role[] = ["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"];

/** List team members, ordered by name. Staff only. */
export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  if (!canManage(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const users = await db.user.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Invite a team member. Staff only.
 * - Only an OWNER may create OWNER or MANAGER accounts.
 * - Email must be unique within the company.
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
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    const password = typeof data?.password === "string" ? data.password : "";
    const role = data?.role as Role | undefined;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }
    if (!role || !ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (
      (role === "OWNER" || role === "MANAGER") &&
      session.user.role !== "OWNER"
    ) {
      return NextResponse.json(
        { error: "Only an owner can invite owners or managers" },
        { status: 403 }
      );
    }

    const existing = await db.user.findFirst({
      where: { companyId: session.user.companyId, email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "That email is already used by another account" },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        companyId: session.user.companyId,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
