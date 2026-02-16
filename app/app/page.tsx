import type { Metadata } from "next"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Dashboard - NovaBuilder",
  description: "Manage your AI-powered apps and workspaces.",
}

export default async function AppDashboardPage() {
  const session = await getSession()
  const userId = session?.sub

  const workspaceWhere = userId ? { members: { some: { userId } } } : {}
  const projectWhere = userId
    ? { workspace: { members: { some: { userId } } } }
    : {}

  const [workspaces, projectCount, liveProjectCount, aiMessageCount, projects] = await Promise.all([
    prisma.workspace.findMany({
      where: workspaceWhere,
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({ where: projectWhere }),
    prisma.project.count({ where: { ...projectWhere, status: "live" } }),
    prisma.projectMessage.count({ where: { project: projectWhere } }),
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ])

  return (
    <DashboardContent
      workspaces={workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        membersCount: workspace._count.members,
      }))}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        updatedAt: project.updatedAt,
      }))}
      projectCount={projectCount}
      liveProjectCount={liveProjectCount}
      aiMessageCount={aiMessageCount}
      primaryWorkspaceId={workspaces[0]?.id ?? null}
      userName={session?.name ?? null}
    />
  )
}
