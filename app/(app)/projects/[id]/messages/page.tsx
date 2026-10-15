import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, getAccessibleProject } from "@/lib/auth-helpers";
import { ProjectTabs } from "@/components/project-tabs";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  cn,
  formatDateTime,
  prettyEnum,
} from "@/components/ui";
import { MessagePostForm } from "@/components/client-portal-actions";

export default async function ProjectMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const messages = await db.message.findMany({
    where: { projectId: id },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Messages"
        description={`The running conversation on ${project.name}.`}
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      <Card>
        <CardHeader title="Thread" />
        <CardBody>
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Start the conversation below — everyone on this project will see it."
            />
          ) : (
            <ul className="space-y-4">
              {messages.map((message) => {
                const own = message.sender.id === session.user.id;
                return (
                  <li
                    key={message.id}
                    className={cn("flex", own ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-xl rounded-2xl px-4 py-2.5",
                        own
                          ? "rounded-br-sm bg-blue-600 text-white"
                          : "rounded-bl-sm bg-gray-100 text-gray-900"
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          own ? "text-blue-100" : "text-gray-500"
                        )}
                      >
                        {message.sender.name} · {prettyEnum(message.sender.role)}
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
        </CardBody>
      </Card>

      <div className="mt-4">
        <MessagePostForm projectId={id} />
      </div>
    </div>
  );
}
