import { WorkspaceContent } from "@/components/dashboard/workspace-content"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  if (!workspace) {
    notFound()
  }

  const [projects, aiMessageCount] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.projectMessage.count({
      where: { project: { workspaceId } },
    }),
  ])
  const recentProjectId = projects[0]?.id ?? null

  return (
    <WorkspaceContent
      workspace={{
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        membersCount: workspace._count.members,
      }}
      recentProjectId={recentProjectId}
      aiMessageCount={aiMessageCount}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        updatedAt: project.updatedAt,
      }))}
    />
  )
}
