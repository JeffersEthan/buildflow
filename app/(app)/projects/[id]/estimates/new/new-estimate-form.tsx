"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  money,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";
import type { Role } from "@prisma/client";

interface LineRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function NewEstimatePage({
  projectId,
  role,
}: {
  projectId: string;
  role: Role;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((s, l) => {
    const q = Number(l.quantity) || 0;
    const p = Number(l.unitPrice) || 0;
    return s + q * p;
  }, 0);

  function setLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
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
        j && typeof j.error === "string"
          ? j.error
          : "Could not create the estimate."
      );
      return;
    }
    const j = await res.json();
    router.push(`/projects/${projectId}/estimates/${j.estimate.id}`);
  }

  return (
    <>
      <PageHeader
        title="New estimate"
        description="Add line items and price each one — the total updates as you type."
      />
      <ProjectTabs projectId={projectId} role={role} />
      <form onSubmit={onSubmit}>
        <Card className="mb-6">
          <CardHeader title="Details" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Kitchen remodel, phase 1"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
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
              <Field label="Notes">
                <Textarea
                  rows={1}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader
            title="Line items"
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
                      placeholder="e.g. Install hardwood flooring"
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
                      placeholder="0.00"
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
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-500">Estimate total</p>
              <p className="text-xl font-bold text-gray-900">{money(total)}</p>
            </div>
          </CardBody>
        </Card>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create estimate"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/projects/${projectId}/estimates`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
