import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  canManage,
  toErrorResponse,
} from "@/lib/auth-helpers";

/** List a project's selections: pending first, then newest. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    const selections = await db.selection.findMany({
      where: { projectId: id },
      include: { decidedBy: { select: { name: true } } },
      // The enum is declared PENDING, APPROVED, DECLINED, so ascending
      // status order surfaces pending items first.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(selections);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Create a selection. Staff (OWNER/MANAGER) only. */
export async function POST(
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
    await requireProjectAccess(id, session);

    const data = await req.json().catch(() => null);
    const category =
      typeof data?.category === "string" ? data.category.trim() : "";
    const title = typeof data?.title === "string" ? data.title.trim() : "";
    const description =
      typeof data?.description === "string" && data.description.trim()
        ? data.description.trim()
        : null;
    if (!category || !title) {
      return NextResponse.json(
        { error: "Category and title are required" },
        { status: 400 }
      );
    }

    const selection = await db.selection.create({
      data: { projectId: id, category, title, description },
      include: { decidedBy: { select: { name: true } } },
    });
    return NextResponse.json(selection, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
