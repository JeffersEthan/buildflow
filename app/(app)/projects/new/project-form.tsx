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

export interface ClientOption {
  id: string;
  name: string;
}

export function ProjectForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          clientId: form.get("clientId") || null,
          status: form.get("status") || "LEAD",
          address: form.get("address") || null,
          startDate: form.get("startDate") || null,
          endDate: form.get("endDate") || null,
          budget: form.get("budget") || null,
          description: form.get("description") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not create the project");
      }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}
      <Field label="Project name">
        <Input name="name" required placeholder="e.g. Maple St Kitchen Remodel" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client">
          <Select name="clientId" defaultValue="">
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="LEAD">
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </Field>
      </div>
      <Field label="Address">
        <Input name="address" placeholder="Street address of the job site" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Start date">
          <Input type="date" name="startDate" />
        </Field>
        <Field label="End date">
          <Input type="date" name="endDate" />
        </Field>
        <Field label="Budget ($)">
          <Input
            type="number"
            name="budget"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          name="description"
          rows={4}
          placeholder="Scope notes, key contacts, anything the crew should know."
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create project"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/projects")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
