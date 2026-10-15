"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Textarea,
  formatDateTime,
  prettyEnum,
  selectionStatusTone,
} from "@/components/ui";
import { SelectionDecisionButtons } from "@/components/client-portal-actions";

interface SerializedSelection {
  id: string;
  category: string;
  title: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED";
  decidedBy: { name: string } | null;
  decidedAt: string | null;
  createdAt: string;
}

function SelectionCard({
  projectId,
  selection,
  isStaff,
}: {
  projectId: string;
  selection: SerializedSelection;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(selection.category);
  const [title, setTitle] = useState(selection.title);
  const [description, setDescription] = useState(selection.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/selections/${selection.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: category.trim(),
            title: title.trim(),
            description: description.trim() || null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the selection");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not save the selection");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${selection.title}"?`)) return;
    const res = await fetch(
      `/api/projects/${projectId}/selections/${selection.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not delete the selection");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="purple">{selection.category}</Badge>
              <Badge tone={selectionStatusTone[selection.status]}>
                {prettyEnum(selection.status)}
              </Badge>
            </div>
            {editing ? (
              <div className="mt-3 space-y-3">
                <Field label="Category">
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </Field>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex gap-2">
                  <Button
                    onClick={save}
                    disabled={saving || !category.trim() || !title.trim()}
                    className="px-3 py-1.5 text-xs"
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="mt-2 text-base font-semibold text-gray-900">
                  {selection.title}
                </h4>
                {selection.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                    {selection.description}
                  </p>
                ) : null}
                {selection.status !== "PENDING" && selection.decidedBy ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Decided by {selection.decidedBy.name} ·{" "}
                    {formatDateTime(selection.decidedAt)}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {!editing ? (
            <div className="flex shrink-0 items-center gap-2">
              {isStaff ? (
                <>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1.5 text-xs"
                    onClick={remove}
                  >
                    Delete
                  </Button>
                </>
              ) : selection.status === "PENDING" ? (
                <SelectionDecisionButtons
                  projectId={projectId}
                  selectionId={selection.id}
                  compact
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Pending staff view: show decision buttons too so staff can decide on a client's behalf. */}
        {isStaff && !editing && selection.status === "PENDING" ? (
          <SelectionDecisionButtons
            projectId={projectId}
            selectionId={selection.id}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}

function SelectionCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create the selection");
        return;
      }
      setCategory("");
      setTitle("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Could not create the selection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Request a decision"
        subtitle="Add a selection the client needs to approve or decline."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Category">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Flooring, Paint, Fixtures"
              required
            />
          </Field>
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kitchen backsplash tile"
              required
            />
          </Field>
          <Field label="Description" hint="Options, links, or notes for the client.">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="submit"
            disabled={saving || !category.trim() || !title.trim()}
            className="w-full"
          >
            {saving ? "Adding…" : "Add selection"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

/** Grouped selection list with role-appropriate actions. */
export function SelectionList({
  projectId,
  selections,
  isStaff,
}: {
  projectId: string;
  selections: SerializedSelection[];
  isStaff: boolean;
}) {
  const pending = selections.filter((s) => s.status === "PENDING");
  const decided = selections.filter((s) => s.status !== "PENDING");

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Waiting on a decision ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <EmptyState
              title="Nothing waiting"
              description="Every selection has been decided."
            />
          ) : (
            <div className="space-y-3">
              {pending.map((s) => (
                <SelectionCard
                  key={s.id}
                  projectId={projectId}
                  selection={s}
                  isStaff={isStaff}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Decided ({decided.length})
          </h3>
          {decided.length === 0 ? (
            <p className="text-sm text-gray-500">No decided selections yet.</p>
          ) : (
            <div className="space-y-3">
              {decided.map((s) => (
                <SelectionCard
                  key={s.id}
                  projectId={projectId}
                  selection={s}
                  isStaff={isStaff}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div>{isStaff ? <SelectionCreateForm projectId={projectId} /> : null}</div>
    </div>
  );
}
