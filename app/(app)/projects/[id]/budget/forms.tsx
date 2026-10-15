"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Textarea, cn } from "@/components/ui";

function apiError(res: Response, fallback: string): Promise<string> {
  return res
    .json()
    .then((j) => (typeof j.error === "string" ? j.error : fallback))
    .catch(() => fallback);
}

export function AddBudgetItemForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: fd.get("category"),
        name: fd.get("name"),
        estimatedCost: fd.get("estimatedCost"),
        actualCost: fd.get("actualCost") || undefined,
        notes: fd.get("notes"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await apiError(res, "Could not add the budget item."));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Field label="Category">
        <Input name="category" required placeholder="e.g. Framing" />
      </Field>
      <Field label="Item name">
        <Input name="name" required placeholder="e.g. Lumber" />
      </Field>
      <Field label="Estimated cost">
        <Input
          name="estimatedCost"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="0.00"
        />
      </Field>
      <Field label="Actual cost (optional)">
        <Input name="actualCost" type="number" min="0" step="0.01" placeholder="0.00" />
      </Field>
      <Field label="Notes (optional)">
        <Textarea name="notes" rows={1} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add item"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>
      ) : null}
    </form>
  );
}

export function ActualCostEditor({
  projectId,
  itemId,
  initial,
}: {
  projectId: string;
  itemId: string;
  initial: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/budget/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualCost: value }),
    });
    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        className="w-28"
        aria-label="Actual cost"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={!dirty || saving}
        onClick={save}
        className="px-3 py-1.5 text-xs"
      >
        {saving ? "…" : "Save"}
      </Button>
    </div>
  );
}

export function DeleteBudgetItemButton({
  projectId,
  itemId,
  name,
}: {
  projectId: string;
  itemId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    await fetch(`/api/projects/${projectId}/budget/${itemId}`, {
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
          className={cn("px-2.5 py-1 text-xs")}
          onClick={remove}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn("px-2.5 py-1 text-xs")}
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
