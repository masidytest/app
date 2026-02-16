import { Suspense } from "react"
import { IDEView } from "@/components/project/ide-view"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

type ConfigJson = {
  files?: Record<string, string>
  htmlContent?: string
}

export default async function ProjectIDEPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    notFound()
  }

  const messages = await prisma.projectMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  const config = project.configJson as ConfigJson | null

  // Build initial file tree:
  // - prefer configJson.files (new format)
  // - fallback to legacy htmlContent as index.html
  const initialFiles: Record<string, string> =
    config?.files ??
    (config?.htmlContent ? { "index.html": config.htmlContent } : {})

  return (
    <Suspense>
      <IDEView
        projectId={projectId}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.createdAt.toISOString(),
        }))}
        initialFiles={initialFiles}
      />
    </Suspense>
  )
}
