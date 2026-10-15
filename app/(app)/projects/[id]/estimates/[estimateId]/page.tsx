import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  canManage,
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  money,
  formatDate,
  formatDateTime,
  estimateStatusTone,
  prettyEnum,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";
import {
  EstimateStatusButtons,
  DeleteEstimateButton,
  EstimateEditForm,
} from "./forms";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string; estimateId: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id, estimateId } = await params;
  const project = await getAccessibleProject(id, session);
  if (!project) redirect("/projects");
  const editable = canManage(session);

  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, projectId: id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!estimate) redirect(`/projects/${id}/estimates`);

  const total = estimate.lines.reduce(
    (s, l) => s + l.quantity * Number(l.unitPrice),
    0
  );

  return (
    <>
      <PageHeader
        title={`${estimate.number} — ${estimate.title}`}
        description={`Created ${formatDateTime(estimate.createdAt)} · last updated ${formatDateTime(estimate.updatedAt)}.`}
        actions={
          <Badge tone={estimateStatusTone[estimate.status]}>
            {prettyEnum(estimate.status)}
          </Badge>
        }
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      <Card className="mb-6">
        <CardHeader
          title="Line items"
          actions={
            editable ? (
              <EstimateStatusButtons projectId={id} estimateId={estimate.id} />
            ) : null
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-right">Unit price</th>
                <th className="px-5 py-3 font-medium text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {estimate.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-gray-500"
                  >
                    No line items yet.
                  </td>
                </tr>
              ) : (
                estimate.lines.map((line, i) => (
                  <tr
                    key={line.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {line.description}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {line.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {money(line.unitPrice)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {money(line.quantity * Number(line.unitPrice))}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-gray-50 font-semibold text-gray-900">
                <td colSpan={4} className="px-5 py-3 text-right">
                  Total
                </td>
                <td className="px-5 py-3 text-right">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Valid until</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {formatDate(estimate.validUntil)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Notes</p>
            <p className="mt-1 text-base text-gray-900">
              {estimate.notes || "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      {editable ? (
        <>
          <EstimateEditForm
            projectId={id}
            estimate={{
              id: estimate.id,
              number: estimate.number,
              title: estimate.title,
              status: estimate.status,
              validUntil: estimate.validUntil?.toISOString() ?? null,
              notes: estimate.notes,
              lines: estimate.lines.map((l) => ({
                id: l.id,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice.toString(),
                position: l.position,
              })),
            }}
          />
          <div className="mt-6 flex justify-end">
            <DeleteEstimateButton
              projectId={id}
              estimateId={estimate.id}
              number={estimate.number}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
