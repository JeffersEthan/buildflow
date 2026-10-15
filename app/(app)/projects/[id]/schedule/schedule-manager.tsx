"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  formatDate,
  prettyEnum,
  scheduleStatusTone,
} from "@/components/ui";

export interface ScheduleItemDto {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  assignedTo: { id: string; name: string } | null;
}

export interface UserOption {
  id: string;
  name: string;
}

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];

export function ScheduleManager({
  projectId,
  items,
  users,
}: {
  projectId: string;
  items: ScheduleItemDto[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          startDate: form.get("startDate"),
          endDate: form.get("endDate"),
          description: form.get("description") || null,
          status: form.get("status") || "SCHEDULED",
          assignedToId: form.get("assignedToId") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not add the schedule item");
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(itemId: string, status: string) {
    const res = await fetch(`/api/projects/${projectId}/schedule/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
    else setError("Could not update the item's status");
  }

  async function remove(itemId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${projectId}/schedule/${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
    else setError("Could not delete the schedule item");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            No schedule items yet. Add the first one to lay out the timeline.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                    {item.assignedTo ? ` · ${item.assignedTo.name}` : ""}
                  </p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={scheduleStatusTone[item.status] ?? "gray"}>
                    {prettyEnum(item.status)}
                  </Badge>
                  <Select
                    aria-label={`Status for ${item.title}`}
                    value={item.status}
                    onChange={(e) => setStatus(item.id, e.target.value)}
                    className="w-auto text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {prettyEnum(s)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="danger"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => remove(item.id, item.title)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-fit rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Add schedule item
        </h3>
        <form onSubmit={addItem} className="space-y-4">
          <Field label="Title">
            <Input name="title" required placeholder="e.g. Foundation pour" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input type="date" name="startDate" required />
            </Field>
            <Field label="End date">
              <Input type="date" name="endDate" required />
            </Field>
          </div>
          <Field label="Assigned to">
            <Select name="assignedToId" defaultValue="">
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Details">
            <Textarea name="description" rows={2} />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Adding…" : "Add to schedule"}
          </Button>
        </form>
      </div>
    </div>
  );
}
