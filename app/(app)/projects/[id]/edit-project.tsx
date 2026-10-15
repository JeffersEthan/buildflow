"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { ClientOption } from "../new/project-form";

export interface ProjectSummary {
  id: string;
  name: string;
  address: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  description: string | null;
  clientId: string | null;
}

/** Modal form for editing a project. PATCHes /api/projects/[id]. */
export function EditProjectButton({
  project,
  clients,
}: {
  project: ProjectSummary;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          address: form.get("address") || null,
          clientId: form.get("clientId") || null,
          status: form.get("status"),
          startDate: form.get("startDate") || null,
          endDate: form.get("endDate") || null,
          budget: form.get("budget") || null,
          description: form.get("description") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save the project");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Edit project
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </p>
          ) : null}
          <Field label="Project name">
            <Input name="name" required defaultValue={project.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <Select name="clientId" defaultValue={project.clientId ?? ""}>
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={project.status}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </Field>
          </div>
          <Field label="Address">
            <Input name="address" defaultValue={project.address ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start date">
              <Input
                type="date"
                name="startDate"
                defaultValue={project.startDate ?? ""}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                name="endDate"
                defaultValue={project.endDate ?? ""}
              />
            </Field>
            <Field label="Budget ($)">
              <Input
                type="number"
                name="budget"
                min="0"
                step="0.01"
                defaultValue={project.budget ?? ""}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              name="description"
              rows={3}
              defaultValue={project.description ?? ""}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
