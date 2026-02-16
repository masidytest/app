import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { MembersManager } from "@/components/workspace/members-manager"

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const session = await getSession()
  if (!session?.sub) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  })
  if (!workspace) notFound()

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-lg font-semibold mb-1">{workspace.name} — Members</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage who has access to this workspace and their roles.
      </p>
      <MembersManager workspaceId={workspaceId} />
    </div>
  )
}
