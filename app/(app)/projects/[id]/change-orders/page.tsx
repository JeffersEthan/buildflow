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
  EmptyState,
  money,
  formatDateTime,
  changeOrderStatusTone,
  prettyEnum,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";
import {
  CreateChangeOrderForm,
  ChangeOrderStatusButtons,
  DeleteChangeOrderButton,
} from "./forms";

export default async function ChangeOrdersPage({
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

  const changeOrders = await db.changeOrder.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const approvedTotal = changeOrders
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <>
      <PageHeader
        title="Change Orders"
        description={`${project.name} — scope changes and their cost impact.`}
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      {changeOrders.length > 0 ? (
        <Card className="mb-6">
          <CardBody>
            <p className="text-sm font-medium text-gray-500">
              Total value of approved change orders
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {money(approvedTotal)}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {editable ? (
        <Card className="mb-6">
          <CardHeader
            title="New change order"
            subtitle="Numbers are assigned automatically (CO-001, CO-002…)."
          />
          <CardBody>
            <CreateChangeOrderForm projectId={id} />
          </CardBody>
        </Card>
      ) : null}

      {changeOrders.length === 0 ? (
        <EmptyState
          title="No change orders yet"
          description="When the scope changes after work starts, record it here with the cost difference."
        />
      ) : (
        <div className="space-y-4">
          {changeOrders.map((co) => (
            <Card key={co.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {co.number}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-gray-900">
                      {co.title}
                    </h3>
                    {co.description ? (
                      <p className="mt-1 max-w-2xl text-sm text-gray-600">
                        {co.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-400">
                      Created {formatDateTime(co.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-bold text-gray-900">
                      {money(co.amount)}
                    </p>
                    <Badge tone={changeOrderStatusTone[co.status]}>
                      {prettyEnum(co.status)}
                    </Badge>
                  </div>
                </div>
                {editable ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <DeleteChangeOrderButton
                      projectId={id}
                      coId={co.id}
                      number={co.number}
                    />
                    <ChangeOrderStatusButtons
                      projectId={id}
                      coId={co.id}
                      currentStatus={co.status}
                    />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
