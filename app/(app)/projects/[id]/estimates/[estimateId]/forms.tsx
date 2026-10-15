"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";

interface LineRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface EstimateDetail {
  id: string;
  number: string;
  title: string;
  status: string;
  validUntil: string | null;
  notes: string | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    position: number;
  }>;
}

export function EstimateStatusButtons({
  projectId,
  estimateId,
}: {
  projectId: string;
  estimateId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function setStatus(status: string) {
    setSaving(status);
    await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    router.refresh();
  }

  const actions = [
    { status: "SENT", label: "Mark sent", variant: "secondary" as const },
    { status: "APPROVED", label: "Approve", variant: "primary" as const },
    { status: "DECLINED", label: "Decline", variant: "danger" as const },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.status}
          type="button"
          variant={a.variant}
          disabled={saving !== null}
          onClick={() => setStatus(a.status)}
        >
          {saving === a.status ? "…" : a.label}
        </Button>
      ))}
    </div>
  );
}

export function DeleteEstimateButton({
  projectId,
  estimateId,
  number,
}: {
  projectId: string;
  estimateId: string;
  number: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
      method: "DELETE",
    });
    router.push(`/projects/${projectId}/estimates`);
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Delete {number}?</span>
        <Button type="button" variant="danger" onClick={remove}>
          Yes, delete
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      onClick={() => setConfirming(true)}
    >
      Delete estimate
    </Button>
  );
}

export function EstimateEditForm({
  projectId,
  estimate,
}: {
  projectId: string;
  estimate: EstimateDetail;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(estimate.title);
  const [number, setNumber] = useState(estimate.number);
  const [status, setStatus] = useState(estimate.status);
  const [validUntil, setValidUntil] = useState(
    estimate.validUntil ? estimate.validUntil.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(estimate.notes ?? "");
  const [lines, setLines] = useState<LineRow[]>(
    estimate.lines.map((l) => ({
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: Number(l.unitPrice).toFixed(2),
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/estimates/${estimate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        number,
        status,
        validUntil: validUntil || null,
        notes: notes || null,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unitPrice: l.unitPrice,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(
        j && typeof j.error === "string" ? j.error : "Could not save changes."
      );
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <Card className="mb-6">
        <CardHeader title="Edit estimate" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field label="Number">
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="APPROVED">Approved</option>
                <option value="DECLINED">Declined</option>
              </Select>
            </Field>
            <Field label="Valid until">
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Line items"
          subtitle="Saving replaces every line below."
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { description: "", quantity: "1", unitPrice: "" },
                ])
              }
            >
              Add row
            </Button>
          }
        />
        <CardBody>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-[1fr_6rem_8rem_2.5rem]"
              >
                <Field label="Description">
                  <Input
                    value={line.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Qty">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                  />
                </Field>
                <Field label="Unit price">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                    required
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((_, j) => j !== i))
                    }
                    aria-label="Remove row"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
