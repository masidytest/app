import Link from "next/link"
import { ExternalLink, Rocket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  stopped: "bg-muted text-muted-foreground border-border",
}

export default async function WorkspaceDeploymentsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })

  if (!workspace) {
    notFound()
  }

  const deployments = await prisma.deployment.findMany({
    where: { project: { workspaceId } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const liveCount = deployments.filter((deployment) => deployment.status === "live").length

  return (
    <div className="px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workspace Deployments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest deployments across {workspace.name} projects.
          </p>
        </div>
        <Link
          href={`/app/workspaces/${workspaceId}`}
          className="text-xs text-primary hover:underline"
        >
          View projects
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total deployments</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{deployments.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Live</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{liveCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Last deployment</p>
          <p className="mt-2 text-sm text-foreground">
            {deployments[0] ? new Date(deployments[0].createdAt).toLocaleString() : "No deployments"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        {deployments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No deployments yet. Trigger a release from a project.</p>
            <Link
              href={`/app/workspaces/${workspaceId}`}
              className="text-xs text-primary hover:underline"
            >
              Go to projects
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <Link
                      href={`/app/projects/${deployment.projectId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {deployment.project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", statusColors[deployment.status ?? "building"])}
                    >
                      {deployment.status ?? "building"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      href={deployment.url ?? `https://${deployment.slug}.novabuilder.app`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {(deployment.url ?? `https://${deployment.slug}.novabuilder.app`).replace("https://", "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {deployment.commit || "--"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(deployment.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
