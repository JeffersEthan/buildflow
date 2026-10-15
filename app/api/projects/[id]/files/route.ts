import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";
import { saveUpload } from "@/lib/upload";

const FILE_CATEGORIES = ["PHOTO", "DOCUMENT", "PLAN"] as const;
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    const files = await db.projectFile.findMany({
      where: { projectId: id },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ files });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    await requireProjectAccess(id, session);
    if (session.user.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50 MB)" },
        { status: 413 }
      );
    }
    const rawCategory = String(form.get("category") ?? "DOCUMENT").toUpperCase();
    const category = (FILE_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as (typeof FILE_CATEGORIES)[number])
      : "DOCUMENT";

    const { storedPath, size } = await saveUpload(file, id);
    const record = await db.projectFile.create({
      data: {
        projectId: id,
        originalName: file.name,
        storedPath,
        size,
        mimeType: file.type || "application/octet-stream",
        category,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { name: true } } },
    });
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
