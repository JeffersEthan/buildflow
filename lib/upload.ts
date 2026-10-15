import path from "path";
import fs from "fs/promises";

/** Local upload root. In Docker this is the /app/uploads named volume. */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

/**
 * Persists a browser File upload under UPLOAD_DIR/<subdir>/ and returns the
 * relative stored path plus byte size. File names are sanitized and prefixed
 * with a timestamp + random token to avoid collisions.
 */
export async function saveUpload(
  file: File,
  subdir: string
): Promise<{ storedPath: string; size: number }> {
  const dir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `${Date.now()}-${token}-${cleanName}`;
  const fullPath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);

  return { storedPath: path.join(subdir, fileName), size: buffer.length };
}

/** Absolute filesystem path for a stored relative upload path. */
export function uploadFullPath(storedPath: string): string {
  return path.join(UPLOAD_DIR, storedPath);
}

/** Removes a stored upload; never throws if the file is already gone. */
export async function deleteUpload(storedPath: string): Promise<void> {
  try {
    await fs.unlink(uploadFullPath(storedPath));
  } catch {
    // File already missing — nothing to do.
  }
}
