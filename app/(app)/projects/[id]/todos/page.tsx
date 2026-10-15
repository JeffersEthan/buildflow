import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  getAccessibleProject,
  requireSession,
} from "@/lib/auth-helpers";
import { ProjectTabs } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui";
import { TodoManager, type TodoDto } from "./todo-manager";

export default async function ProjectTodosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;

  const project = await getAccessibleProject(id, session);
  if (!project) notFound();

  const [todos, users] = await Promise.all([
    db.todo.findMany({
      where: { projectId: id },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    db.user.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const dto: TodoDto[] = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    priority: todo.priority,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    assignedTo: todo.assignedTo,
  }));

  return (
    <div>
      <PageHeader
        title={`${project.name} — To-Dos`}
        description="Track every open item, who owns it, and when it's due."
      />
      <ProjectTabs projectId={project.id} role={session.user.role} />
      <TodoManager projectId={project.id} todos={dto} users={users} />
    </div>
  );
}
