"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  Input,
  Textarea,
  formatDate,
  toDateInput,
} from "@/components/ui";

export interface LogDto {
  id: string;
  date: string;
  weather: string | null;
  workersOnSite: number | null;
  hoursWorked: number | null;
  notes: string | null;
  createdBy: { name: string } | null;
}

export function LogManager({
  projectId,
  logs,
}: {
  projectId: string;
  logs: LogDto[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${projectId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.get("date"),
          weather: form.get("weather") || null,
          workersOnSite: form.get("workersOnSite") || null,
          hoursWorked: form.get("hoursWorked") || null,
          notes: form.get("notes") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save the log");
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove(logId: string, date: string) {
    if (!confirm(`Delete the log for ${formatDate(date)}? This cannot be undone.`))
      return;
    const res = await fetch(`/api/projects/${projectId}/logs/${logId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
    else setError("Could not delete the log");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </p>
        ) : null}
        {logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            No daily logs yet. Record the first day of work to start the paper trail.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {formatDate(log.date)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => remove(log.id, log.date)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {log.weather ? <span>Weather: {log.weather}</span> : null}
                  {log.workersOnSite !== null ? (
                    <span>Workers: {log.workersOnSite}</span>
                  ) : null}
                  {log.hoursWorked !== null ? (
                    <span>Hours: {log.hoursWorked}</span>
                  ) : null}
                  {log.createdBy?.name ? (
                    <span>Logged by {log.createdBy.name}</span>
                  ) : null}
                </div>
                {log.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                    {log.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-fit rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Log a day
        </h3>
        <form onSubmit={addLog} className="space-y-4">
          <Field label="Date">
            <Input
              type="date"
              name="date"
              required
              defaultValue={toDateInput(new Date())}
            />
          </Field>
          <Field label="Weather">
            <Input name="weather" placeholder="e.g. Sunny, 72°F" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Workers on site">
              <Input type="number" name="workersOnSite" min="0" step="1" />
            </Field>
            <Field label="Hours worked">
              <Input type="number" name="hoursWorked" min="0" step="0.5" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              name="notes"
              rows={4}
              placeholder="What got done today, delays, visitors, deliveries…"
            />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save log"}
          </Button>
        </form>
      </div>
    </div>
  );
}
