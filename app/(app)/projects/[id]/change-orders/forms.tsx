"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Textarea, Select } from "@/components/ui";

export function CreateChangeOrderForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/change-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description"),
        amount: fd.get("amount"),
        status: fd.get("status"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(
        j && typeof j.error === "string"
          ? j.error
          : "Could not create the change order."
      );
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field label="Title">
        <Input name="title" required placeholder="e.g. Add patio door" />
      </Field>
      <Field label="Amount" hint="Negative for a credit back.">
        <Input
          name="amount"
          type="number"
          step="0.01"
          required
          placeholder="0.00"
        />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue="DRAFT">
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
        </Select>
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={1} />
      </Field>
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add change order"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">
          {error}
        </p>
      ) : null}
    </form>
  );
}

const NEXT_STATUSES: Record<string, Array<{ status: string; label: string; variant: "secondary" | "primary" | "danger" }>> = {
  DRAFT: [
    { status: "PENDING", label: "Submit", variant: "secondary" },
    { status: "APPROVED", label: "Approve", variant: "primary" },
    { status: "DECLINED", label: "Decline", variant: "danger" },
  ],
  PENDING: [
    { status: "APPROVED", label: "Approve", variant: "primary" },
    { status: "DECLINED", label: "Decline", variant: "danger" },
    { status: "DRAFT", label: "Back to draft", variant: "secondary" },
  ],
  APPROVED: [{ status: "DECLINED", label: "Decline", variant: "danger" }],
  DECLINED: [
    { status: "PENDING", label: "Reopen", variant: "secondary" },
    { status: "APPROVED", label: "Approve", variant: "primary" },
  ],
};

export function ChangeOrderStatusButtons({
  projectId,
  coId,
  currentStatus,
}: {
  projectId: string;
  coId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function setStatus(status: string) {
    setSaving(status);
    await fetch(`/api/projects/${projectId}/change-orders/${coId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    router.refresh();
  }

  const actions = NEXT_STATUSES[currentStatus] ?? [];
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.map((a) => (
        <Button
          key={a.status}
          type="button"
          variant={a.variant}
          className="px-2.5 py-1 text-xs"
          disabled={saving !== null}
          onClick={() => setStatus(a.status)}
        >
          {saving === a.status ? "…" : a.label}
        </Button>
      ))}
    </div>
  );
}

export function DeleteChangeOrderButton({
  projectId,
  coId,
  number,
}: {
  projectId: string;
  coId: string;
  number: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    await fetch(`/api/projects/${projectId}/change-orders/${coId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete {number}?</span>
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
