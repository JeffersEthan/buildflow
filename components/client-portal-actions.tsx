"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea, cn } from "@/components/ui";

/**
 * Approve / Decline buttons for a pending selection.
 * PATCHes the selections API with the decision; the decision record is
 * attributed to the signed-in user server-side.
 */
export function SelectionDecisionButtons({
  projectId,
  selectionId,
  compact,
}: {
  projectId: string;
  selectionId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "APPROVED" | "DECLINED") {
    setSaving(status);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/selections/${selectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not record your decision");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not record your decision");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={cn(compact ? "" : "mt-3")}>
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="px-3 py-1.5 text-xs"
          disabled={saving !== null}
          onClick={() => decide("APPROVED")}
        >
          {saving === "APPROVED" ? "Saving…" : "Approve"}
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={saving !== null}
          onClick={() => decide("DECLINED")}
        >
          {saving === "DECLINED" ? "Saving…" : "Decline"}
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

/** Message composer that posts to the project's thread and refreshes. */
export function MessagePostForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send the message");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Could not send the message");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Write a message…"
        />
      </div>
      <div className="flex flex-col justify-end">
        <Button type="submit" disabled={sending || !body.trim()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
