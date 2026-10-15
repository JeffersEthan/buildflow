import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, canManage } from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  PageHeader,
} from "@/components/ui";
import { ClientCreateForm } from "./client-form";

export default async function ClientsPage() {
  const session = await requireSession();
  if (!canManage(session)) redirect("/dashboard");

  const clients = await db.client.findMany({
    where: { companyId: session.user.companyId },
    include: {
      _count: { select: { projects: true } },
      user: { select: { email: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Everyone you build for — and who can sign in to the client portal."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Portal login</th>
                    <th className="px-5 py-3 font-semibold">Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-sm text-gray-500"
                      >
                        No clients yet — add your first one on the right.
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {client.email ?? client.phone ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          {client.user ? (
                            <Badge tone="green">{client.user.email}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {client._count.projects}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <div>
          <ClientCreateForm />
        </div>
      </div>
    </div>
  );
}
