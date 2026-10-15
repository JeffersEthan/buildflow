import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, getAccessibleProject } from "@/lib/auth-helpers";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  cn,
  formatDate,
  formatDateTime,
  money,
  prettyEnum,
  projectStatusTone,
  scheduleStatusTone,
  selectionStatusTone,
  estimateStatusTone,
} from "@/components/ui";
import {
  MessagePostForm,
  SelectionDecisionButtons,
} from "@/components/client-portal-actions";

const fileCategoryTone: Record<string, string> = {
  PHOTO: "green",
  DOCUMENT: "blue",
  PLAN: "purple",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Simplified read-mostly project view for CLIENT-role users: project
 * details, upcoming schedule, selections awaiting their decision, shared
 * files, estimates, and the message thread.
 *
 * NOTE: the export signature must stay stable:
 *   ClientProjectView({ projectId }: { projectId: string })
 */
export async function ClientProjectView({
  projectId,
}: {
  projectId: string;
}) {
  const session = await requireSession();
  const project = await getAccessibleProject(projectId, session);
  if (!project) notFound();

  const [schedule, selections, messages, files, estimates] = await Promise.all([
    db.scheduleItem.findMany({
      where: { projectId },
      orderBy: { startDate: "asc" },
      take: 8,
    }),
    db.selection.findMany({
      where: { projectId },
      include: { decidedBy: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.message.findMany({
      where: { projectId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    db.estimate.findMany({
      where: { projectId },
      include: { lines: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingSelections = selections.filter((s) => s.status === "PENDING");
  // Seed/demo assets live under seed/ and are never shown in the portal.
  const sharedFiles = files.filter(
    (file) => !file.storedPath.startsWith("seed/")
  );

  const estimateTotals = estimates.map((estimate) => ({
    ...estimate,
    total: estimate.lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
      0
    ),
  }));

  return (
    <div>
      <PageHeader
        title={project.name}
        description="Your project portal — progress, upcoming work, and open items."
      />

      {/* Project header */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={projectStatusTone[project.status]}>
                  {prettyEnum(project.status)}
                </Badge>
                {project.address ? (
                  <span className="text-sm text-gray-500">{project.address}</span>
                ) : null}
              </div>
              {project.description ? (
                <p className="mt-2 max-w-2xl text-sm text-gray-600">
                  {project.description}
                </p>
              ) : null}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-gray-500">Start</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {formatDate(project.startDate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Target completion</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {formatDate(project.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Budget</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {money(project.budget)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {project.client?.name ?? "—"}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Upcoming schedule */}
        <Card>
          <CardHeader title="Upcoming work" subtitle="What's scheduled next" />
          <CardBody>
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500">
                No scheduled items yet — check back soon.
              </p>
            ) : (
              <ul className="space-y-3">
                {schedule.map((item) => (
                  <li key={item.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <Badge tone={scheduleStatusTone[item.status]}>
                        {prettyEnum(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-gray-500">
                      {formatDate(item.startDate)} – {formatDate(item.endDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Selections awaiting decision */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Selections"
            subtitle={
              pendingSelections.length > 0
                ? `${pendingSelections.length} waiting on your decision`
                : "Nothing waiting on you right now"
            }
          />
          <CardBody>
            {selections.length === 0 ? (
              <p className="text-sm text-gray-500">
                No selections yet. When your builder needs a decision on
                materials, fixtures, or finishes, it will show up here.
              </p>
            ) : (
              <ul className="space-y-4">
                {selections.map((selection) => (
                  <li
                    key={selection.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="purple">{selection.category}</Badge>
                          <Badge
                            tone={selectionStatusTone[selection.status]}
                          >
                            {prettyEnum(selection.status)}
                          </Badge>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-gray-900">
                          {selection.title}
                        </h4>
                        {selection.description ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                            {selection.description}
                          </p>
                        ) : null}
                        {selection.status !== "PENDING" &&
                        selection.decidedBy ? (
                          <p className="mt-2 text-xs text-gray-500">
                            Decided by {selection.decidedBy.name} ·{" "}
                            {formatDateTime(selection.decidedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {selection.status === "PENDING" ? (
                      <SelectionDecisionButtons
                        projectId={projectId}
                        selectionId={selection.id}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Messages */}
        <Card className="lg:col-span-2">
          <CardHeader title="Messages" subtitle="Talk with your builder" />
          <CardBody>
            {messages.length === 0 ? (
              <p className="mb-4 text-sm text-gray-500">
                No messages yet — say hello below.
              </p>
            ) : (
              <ul className="mb-4 space-y-3">
                {messages.map((message) => {
                  const own = message.sender.id === session.user.id;
                  return (
                    <li
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        own ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                        {initials(message.sender.name)}
                      </span>
                      <div
                        className={cn(
                          "max-w-md rounded-2xl px-4 py-2.5",
                          own
                            ? "rounded-tr-sm bg-blue-600 text-white"
                            : "rounded-tl-sm bg-gray-100 text-gray-900"
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            own ? "text-blue-100" : "text-gray-500"
                          )}
                        >
                          {message.sender.name} ·{" "}
                          {prettyEnum(message.sender.role)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {message.body}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-right text-[11px]",
                            own ? "text-blue-200" : "text-gray-400"
                          )}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <MessagePostForm projectId={projectId} />
          </CardBody>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader title="Shared files" subtitle="Photos, documents & plans" />
          <CardBody>
            {sharedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nothing shared yet — files from your builder will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {sharedFiles.map((file) => (
                  <li key={file.id}>
                    <a
                      href={`/api/files/${file.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">
                          {file.originalName}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {formatDate(file.createdAt)}
                        </span>
                      </span>
                      <Badge tone={fileCategoryTone[file.category] ?? "gray"}>
                        {prettyEnum(file.category)}
                      </Badge>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Estimates */}
      <div className="mt-5">
        <Card>
          <CardHeader title="Estimates" subtitle="Proposals for your review" />
          <CardBody>
            {estimateTotals.length === 0 ? (
              <p className="text-sm text-gray-500">
                No estimates yet — proposals will show up here when they're
                ready.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {estimateTotals.map((estimate) => (
                  <div
                    key={estimate.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {estimate.number} — {estimate.title}
                        </p>
                        {estimate.validUntil ? (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Valid until {formatDate(estimate.validUntil)}
                          </p>
                        ) : null}
                      </div>
                      <Badge tone={estimateStatusTone[estimate.status]}>
                        {prettyEnum(estimate.status)}
                      </Badge>
                    </div>
                    {estimate.lines.length > 0 ? (
                      <table className="mt-3 w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                          {estimate.lines.map((line) => {
                            const lineTotal =
                              Number(line.quantity) * Number(line.unitPrice);
                            return (
                              <tr key={line.id}>
                                <td className="py-1.5 pr-2 text-gray-700">
                                  {line.description}
                                  <span className="ml-2 text-xs text-gray-400">
                                    × {line.quantity}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right font-medium text-gray-900">
                                  {money(lineTotal)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td className="py-1.5 pr-2 text-sm font-semibold text-gray-900">
                              Total
                            </td>
                            <td className="py-1.5 text-right text-sm font-semibold text-gray-900">
                              {money(estimate.total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ) : estimate.notes ? (
                      <p className="mt-2 text-sm text-gray-600">
                        {estimate.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
