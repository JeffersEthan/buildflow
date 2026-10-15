"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Field, Select } from "@/components/ui";

export function UploadFileForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: fd,
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(
        j && typeof j.error === "string"
          ? j.error
          : "Could not upload the file."
      );
      return;
    }
    form.reset();
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
      <Field label="File">
        <input
          ref={fileRef}
          type="file"
          name="file"
          className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue="DOCUMENT">
          <option value="PHOTO">Photo</option>
          <option value="DOCUMENT">Document</option>
          <option value="PLAN">Plan</option>
        </Select>
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? "Uploading…" : "Upload"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-red-600">{error}</p>
      ) : null}
    </form>
  );
}

export function DeleteFileButton({
  projectId,
  fileId,
  name,
}: {
  projectId: string;
  fileId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete “{name}”?</span>
        <Button
          type="button"
          variant="danger"
          className="px-2.5 py-1 text-xs"
          onClick={remove}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-2.5 py-1 text-xs"
          onClick={() => setConfirming(false)}
        >
          No
        </Button>
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
      onClick={() => setConfirming(true)}
    >
      Delete
    </Button>
  );
}
