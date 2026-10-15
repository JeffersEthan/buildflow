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
  formatDateTime,
} from "@/components/ui";
import { ProjectTabs } from "@/components/project-tabs";
import { UploadFileForm, DeleteFileButton } from "./forms";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const SECTIONS = [
  { category: "PHOTO", title: "Photos", subtitle: "Site photos and progress shots." },
  { category: "PLAN", title: "Plans", subtitle: "Drawings, blueprints and site plans." },
  { category: "DOCUMENT", title: "Documents", subtitle: "Contracts, permits and paperwork." },
] as const;

export default async function FilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.user.role === "CLIENT") redirect("/projects");
  const { id } = await params;
  const project = await getAccessibleProject(id, session);
  if (!project) redirect("/projects");
  const canDelete = canManage(session);

  const files = await db.projectFile.findMany({
    where: { projectId: id },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Files"
        description={`${project.name} — photos, plans and documents for the job.`}
      />
      <ProjectTabs projectId={id} role={session.user.role} />

      <Card className="mb-6">
        <CardHeader
          title="Upload a file"
          subtitle="Up to 50 MB. Subcontractors and managers can upload; only owners and managers can delete."
        />
        <CardBody>
          <UploadFileForm projectId={id} />
        </CardBody>
      </Card>

      {files.length === 0 ? (
        <EmptyState
          title="No files yet"
          description="Upload the first photo, plan or document to share it with the team."
        />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const sectionFiles = files.filter(
              (f) => f.category === section.category
            );
            if (sectionFiles.length === 0) return null;
            return (
              <Card key={section.category}>
                <CardHeader
                  title={section.title}
                  subtitle={section.subtitle}
                />
                <ul className="divide-y divide-gray-50">
                  {sectionFiles.map((file) => {
                    const isSample =
                      file.size === 0 || file.storedPath.startsWith("seed/");
                    return (
                      <li
                        key={file.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                            <span className="truncate">{file.originalName}</span>
                            {isSample ? (
                              <Badge tone="purple">sample</Badge>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatBytes(file.size)} · uploaded by{" "}
                            {file.uploadedBy.name} ·{" "}
                            {formatDateTime(file.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSample ? (
                            <span className="text-xs italic text-gray-400">
                              Preview data — no file attached
                            </span>
                          ) : (
                            <a
                              href={`/api/files/${file.id}`}
                              className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          )}
                          {canDelete ? (
                            <DeleteFileButton
                              projectId={id}
                              fileId={file.id}
                              name={file.originalName}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
