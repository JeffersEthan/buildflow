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
  cn,
  formatDate,
  prettyEnum,
  priorityTone,
  todoStatusTone,
} from "@/components/ui";

export interface TodoDto {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: { id: string; name: string } | null;
}

export interface UserOption {
  id: string;
  name: string;
}

const COLUMNS = ["OPEN", "IN_PROGRESS", "DONE"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TodoManager({
  projectId,
  todos,
  users,
}: {
  projectId: string;
  todos: TodoDto[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTodo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${projectId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description") || null,
          priority: form.get("priority") || "MEDIUM",
          dueDate: form.get("dueDate") || null,
          assignedToId: form.get("assignedToId") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not add the to-do");
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(todoId: string, status: string) {
    const res = await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
    else setError("Could not update the to-do");
  }

  async function remove(todoId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
    else setError("Could not delete the to-do");
  }

  const byStatus = (status: string) => todos.filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((status) => (
          <section
            key={status}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-gray-800">
                {prettyEnum(status)}
              </h3>
              <Badge tone={todoStatusTone[status] ?? "gray"}>
                {byStatus(status).length}
              </Badge>
            </div>
            <div className="space-y-2">
              {byStatus(status).length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-gray-400">
                  Nothing here.
                </p>
              ) : (
                byStatus(status).map((todo) => (
                  <article
                    key={todo.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {todo.title}
                    </p>
                    {todo.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {todo.description}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-gray-500">
                      {todo.dueDate ? `Due ${formatDate(todo.dueDate)}` : "No due date"}
                      {todo.assignedTo ? ` · ${todo.assignedTo.name}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={priorityTone[todo.priority] ?? "gray"}>
                        {prettyEnum(todo.priority)}
                      </Badge>
                      <Select
                        aria-label={`Move "${todo.title}" to`}
                        value={todo.status}
                        onChange={(e) => setStatus(todo.id, e.target.value)}
                        className={cn("w-auto px-2 py-1 text-xs")}
                      >
                        {COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            {prettyEnum(s)}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => remove(todo.id, todo.title)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Add to-do
        </h3>
        <form onSubmit={addTodo} className="space-y-4">
          <Field label="Title">
            <Input name="title" required placeholder="e.g. Order window hardware" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Priority">
              <Select name="priority" defaultValue="MEDIUM">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {prettyEnum(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" name="dueDate" />
            </Field>
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
          </div>
          <Field label="Details">
            <Textarea name="description" rows={2} />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Adding…" : "Add to-do"}
          </Button>
        </form>
      </div>
    </div>
  );
}
