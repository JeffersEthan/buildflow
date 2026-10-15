import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  canManage,
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import {
  PageHeader,
  Card,
  CardBody,
  Badge,
  EmptyState,
  LinkButton,
  money,
  formatDate,
  estimateStatusTone,
  prettyEnum,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";

export default async function EstimatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;
  const project = await getAccessibleProject(id, session);
  if (!project) redirect("/projects");
  const editable = canManage(session);

  const estimates = await db.estimate.findMany({
    where: { projectId: id },
    include: { lines: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Estimates"
        description={`${project.name} — price quotes built from line items.`}
        actions={
          editable ? (
            <LinkButton href={`/projects/${id}/estimates/new`}>
              New estimate
            </LinkButton>
          ) : null
        }
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      {estimates.length === 0 ? (
        <EmptyState
          title="No estimates yet"
          description="Draft an estimate with line items to share a priced scope of work."
          action={
            editable ? (
              <LinkButton href={`/projects/${id}/estimates/new`}>
                New estimate
              </LinkButton>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {estimates.map((estimate) => {
            const total = estimate.lines.reduce(
              (s, l) => s + l.quantity * Number(l.unitPrice),
              0
            );
            return (
              <Link
                key={estimate.id}
                href={`/projects/${id}/estimates/${estimate.id}`}
                className="transition hover:-translate-y-0.5"
              >
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {estimate.number}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-gray-900">
                          {estimate.title}
                        </h3>
                      </div>
                      <Badge tone={estimateStatusTone[estimate.status]}>
                        {prettyEnum(estimate.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-end justify-between text-sm">
                      <div className="text-gray-500">
                        <p>{estimate.lines.length} line item(s)</p>
                        <p className="mt-0.5">
                          Valid until {formatDate(estimate.validUntil)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {money(total)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
