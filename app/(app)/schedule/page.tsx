import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  formatDate,
  prettyEnum,
  scheduleStatusTone,
} from "@/components/ui";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function GlobalSchedulePage() {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");

  const cutoff = new Date(Date.now() + THIRTY_DAYS_MS);

  const items = await db.scheduleItem.findMany({
    where: {
      status: { not: "COMPLETED" },
      endDate: { lte: cutoff },
      project: { companyId: session.user.companyId },
    },
    include: {
      project: { select: { id: true, name: true, status: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { endDate: "asc" },
  });

  const grouped = new Map<string, { name: string; id: string; items: typeof items }>();
  for (const item of items) {
    const key = item.project.id;
    const entry = grouped.get(key);
    if (entry) {
      entry.items.push(item);
    } else {
      grouped.set(key, {
        id: item.project.id,
        name: item.project.name,
        items: [item],
      });
    }
  }

  const now = Date.now();
  const overdue = items.filter((i) => i.endDate.getTime() < now && i.status !== "COMPLETED").length;

  return (
    <div>
      <PageHeader
        title="Schedule"
        description={`Open schedule items due in the past or the next 30 days — ${items.length} item${items.length === 1 ? "" : "s"}${overdue > 0 ? `, ${overdue} overdue` : ""}.`}
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nothing on the horizon"
          description="No open schedule items are due in the past or the next 30 days."
        />
      ) : (
        <div className="space-y-5">
          {[...grouped.values()].map((group) => (
            <Card key={group.id}>
              <CardHeader
                title={group.name}
                actions={
                  <Link
                    href={`/projects/${group.id}/schedule`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Full schedule →
                  </Link>
                }
              />
              <CardBody className="p-0">
                <ul className="divide-y divide-gray-100">
                  {group.items.map((item) => {
                    const isOverdue =
                      item.endDate.getTime() < now && item.status !== "COMPLETED";
                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatDate(item.startDate)} – {formatDate(item.endDate)}
                            {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue ? (
                            <Badge tone="red">Overdue</Badge>
                          ) : null}
                          <Badge tone={scheduleStatusTone[item.status] ?? "gray"}>
                            {prettyEnum(item.status)}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
