"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Field, Input } from "@/components/ui";

/** Create-client form with an optional "create portal login" section. */
export function ClientCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          createLogin,
          loginEmail,
          loginPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create the client");
        return;
      }
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCreateLogin(false);
      setLoginEmail("");
      setLoginPassword("");
      router.refresh();
    } catch {
      setError("Could not create the client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Add a client"
        subtitle="Keep contact details in one place."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dana and Sam Rivera"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, state"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Create a portal login
          </label>

          {createLogin ? (
            <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <Field
                label="Login email"
                hint="Defaults to the contact email above."
              >
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={email || "client@example.com"}
                />
              </Field>
              <Field label="Login password">
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving…" : "Add client"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
