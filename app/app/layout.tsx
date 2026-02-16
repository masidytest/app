import { AppSidebar } from "@/components/app-sidebar"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const userId = session?.sub

  const workspaces = await prisma.workspace.findMany({
    where: userId ? { members: { some: { userId } } } : {},
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const activeWorkspace = workspaces[0] ?? null
  const recentProject = activeWorkspace
    ? await prisma.project.findFirst({
        where: { workspaceId: activeWorkspace.id },
        orderBy: { updatedAt: "desc" },
      })
    : null

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const sidebarWorkspaces = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    plan: workspace.plan,
    membersCount: workspace._count.members,
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        workspaces={sidebarWorkspaces}
        activeWorkspaceId={activeWorkspace?.id ?? null}
        recentProjectId={recentProject?.id ?? null}
        user={user ? { name: user.name, email: user.email } : null}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
