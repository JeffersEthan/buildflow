import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  canManage,
  requireApiSession,
  requireProjectAccess,
  toErrorResponse,
} from "@/lib/auth-helpers";
import { deleteUpload } from "@/lib/upload";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id, fileId } = await params;
    await requireProjectAccess(id, session);
    if (!canManage(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const record = await db.projectFile.findFirst({
      where: { id: fileId, projectId: id },
    });
    if (!record)
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    await db.projectFile.delete({ where: { id: fileId } });
    await deleteUpload(record.storedPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
