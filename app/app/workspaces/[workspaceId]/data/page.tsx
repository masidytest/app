import Link from "next/link"
import { Database, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function WorkspaceDataPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })

  if (!workspace) {
    notFound()
  }

  const [projectCount, deploymentCount, messageCount, recentMessages] = await Promise.all([
    prisma.project.count({ where: { workspaceId } }),
    prisma.deployment.count({ where: { project: { workspaceId } } }),
    prisma.projectMessage.count({ where: { project: { workspaceId } } }),
    prisma.projectMessage.findMany({
      where: { project: { workspaceId } },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  return (
    <div className="px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workspace Data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage and message activity for {workspace.name}.
          </p>
        </div>
        <Link
          href={`/app/workspaces/${workspaceId}`}
          className="text-xs text-primary hover:underline"
        >
          Back to workspace
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projects</CardTitle>
            <CardDescription>Total projects in this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{projectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deployments</CardTitle>
            <CardDescription>All deployments across projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{deploymentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Messages</CardTitle>
            <CardDescription>Messages stored for the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{messageCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Recent Messages
            </CardTitle>
            <CardDescription>Latest builder conversations across projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                No messages yet. Start a conversation from the IDE.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Link
                          href={`/app/projects/${message.projectId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {message.project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {message.role}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {message.content.length > 80
                          ? `${message.content.slice(0, 80)}...`
                          : message.content}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
