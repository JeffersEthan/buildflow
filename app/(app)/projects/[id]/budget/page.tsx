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
  cn,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";
import {
  AddBudgetItemForm,
  ActualCostEditor,
  DeleteBudgetItemButton,
} from "./forms";

export default async function BudgetPage({
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

  const items = await db.budgetItem.findMany({
    where: { projectId: id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const totalEstimated = items.reduce(
    (s, i) => s + Number(i.estimatedCost),
    0
  );
  const totalActual = items.reduce((s, i) => s + Number(i.actualCost), 0);
  const variance = totalActual - totalEstimated;

  // Group by category, preserving the category/name sort order.
  const groups: Array<{
    category: string;
    items: typeof items;
    estimated: number;
    actual: number;
  }> = [];
  for (const item of items) {
    let group = groups.find((g) => g.category === item.category);
    if (!group) {
      group = { category: item.category, items: [], estimated: 0, actual: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.estimated += Number(item.estimatedCost);
    group.actual += Number(item.actualCost);
  }

  const cards = [
    { label: "Total estimated", value: money(totalEstimated) },
    { label: "Total actual", value: money(totalActual) },
    {
      label: "Variance (actual − estimated)",
      value: money(Math.abs(variance)),
      note: variance === 0 ? "On budget" : variance > 0 ? "Over budget" : "Under budget",
      tone: variance > 0 ? "red" : "green",
    },
    ...(project.budget != null
      ? [{ label: "Project budget", value: money(project.budget) }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Budget"
        description={`${project.name} — planned vs. actual costs by category.`}
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBody>
              <p className="text-sm font-medium text-gray-500">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{c.value}</p>
              {"note" in c && c.note ? (
                <p
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    c.tone === "red" ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  {c.note}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      {editable ? (
        <Card className="mb-6">
          <CardHeader
            title="Add budget item"
            subtitle="Log an estimated cost line. Actuals can be filled in as the work proceeds."
          />
          <CardBody>
            <AddBudgetItemForm projectId={id} />
          </CardBody>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No budget items yet"
          description="Break the project into cost lines by category to track estimated and actual spend."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.category}>
              <CardHeader
                title={group.category}
                actions={
                  <div className="text-sm text-gray-500">
                    Est. {money(group.estimated)} · Actual {money(group.actual)}
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3 font-medium">Item</th>
                      <th className="px-5 py-3 font-medium">Estimated</th>
                      <th className="px-5 py-3 font-medium">Actual</th>
                      <th className="px-5 py-3 font-medium">Variance</th>
                      {editable ? (
                        <th className="px-5 py-3 font-medium text-right">
                          Actions
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const rowVar =
                        Number(item.actualCost) - Number(item.estimatedCost);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>
                            {item.notes ? (
                              <p className="mt-0.5 text-xs text-gray-500">
                                {item.notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            {money(item.estimatedCost)}
                          </td>
                          <td className="px-5 py-3">
                            {editable ? (
                              <ActualCostEditor
                                projectId={id}
                                itemId={item.id}
                                initial={Number(item.actualCost).toString()}
                              />
                            ) : (
                              <span className="text-gray-700">
                                {money(item.actualCost)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                "font-medium",
                                rowVar > 0 ? "text-red-600" : "text-emerald-600"
                              )}
                            >
                              {rowVar > 0 ? "+" : ""}
                              {money(rowVar)}
                            </span>
                          </td>
                          {editable ? (
                            <td className="px-5 py-3 text-right">
                              <DeleteBudgetItemButton
                                projectId={id}
                                itemId={item.id}
                                name={item.name}
                              />
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold text-gray-900">
                      <td className="px-5 py-3">Subtotal</td>
                      <td className="px-5 py-3">{money(group.estimated)}</td>
                      <td className="px-5 py-3">{money(group.actual)}</td>
                      <td className="px-5 py-3">
                        {money(group.actual - group.estimated)}
                      </td>
                      {editable ? <td /> : null}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {project.budget != null ? (
        <div className="mt-6">
          <Badge tone={totalActual > Number(project.budget) ? "red" : "green"}>
            Project budget {money(project.budget)} · actual spend{" "}
            {money(totalActual)}
          </Badge>
        </div>
      ) : null}
    </>
  );
}
