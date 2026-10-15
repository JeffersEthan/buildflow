import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { db } from "@/lib/db";
import {
  getAccessibleProject,
  requireApiSession,
  toErrorResponse,
} from "@/lib/auth-helpers";
import { uploadFullPath } from "@/lib/upload";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;
  try {
    const { id } = await params;
    const record = await db.projectFile.findUnique({ where: { id } });
    if (!record)
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    // Clients reach this through the client portal — access is checked here.
    const project = await getAccessibleProject(record.projectId, session);
    if (!project)
      return NextResponse.json({ error: "File not found" }, { status: 404 });

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(uploadFullPath(record.storedPath));
    } catch {
      return NextResponse.json(
        { error: "File is missing from storage" },
        { status: 404 }
      );
    }
    const safeName = record.originalName.replace(/["\r\n]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${safeName}"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
