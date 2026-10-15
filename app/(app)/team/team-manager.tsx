"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  formatDate,
  prettyEnum,
} from "@/components/ui";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

/** Invite form plus the member table with role changes and removals. */
export function TeamManager({
  currentUserId,
  isOwner,
  allowedRoles,
}: {
  currentUserId: string;
  isOwner: boolean;
  allowedRoles: string[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(allowedRoles[allowedRoles.length - 1] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not invite this person");
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch {
      setError("Could not invite this person");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not change the role");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    router.refresh();
  }

  async function removeMember(memberId: string, memberName: string) {
    if (
      !window.confirm(
        `Remove ${memberName} from the team? They will lose access immediately.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not remove this person");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                  {isOwner ? (
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={isOwner ? 5 : 4}
                      className="px-5 py-8 text-center text-sm text-gray-500"
                    >
                      Loading team…
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isOwner ? 5 : 4}
                      className="px-5 py-8 text-center text-sm text-gray-500"
                    >
                      Nobody here yet.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const isSelf = member.id === currentUserId;
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {member.name}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              (you)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{member.email}</td>
                        <td className="px-5 py-3">
                          {isOwner && !isSelf ? (
                            <Select
                              value={member.role}
                              onChange={(e) => changeRole(member.id, e.target.value)}
                              className="w-auto py-1 text-sm"
                            >
                              {["OWNER", "MANAGER", "SUBCONTRACTOR", "CLIENT"].map(
                                (r) => (
                                  <option key={r} value={r}>
                                    {prettyEnum(r)}
                                  </option>
                                )
                              )}
                            </Select>
                          ) : (
                            <Badge tone="blue">{prettyEnum(member.role)}</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {formatDate(member.createdAt)}
                        </td>
                        {isOwner ? (
                          <td className="px-5 py-3 text-right">
                            {!isSelf ? (
                              <Button
                                variant="danger"
                                className="px-3 py-1.5 text-xs"
                                onClick={() => removeMember(member.id, member.name)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader
            title="Invite someone"
            subtitle="They sign in with this email and password."
          />
          <CardBody>
            <form onSubmit={invite} className="space-y-4">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                />
              </Field>
              <Field label="Temporary password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Role">
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {prettyEnum(r)}
                    </option>
                  ))}
                </Select>
              </Field>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Inviting…" : "Invite"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
