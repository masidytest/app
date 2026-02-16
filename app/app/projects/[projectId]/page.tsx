import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code, Rocket, FlaskConical, Clock, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

const deployStatusColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  stopped: "bg-muted text-muted-foreground border-border",
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  })

  if (!project) {
    notFound()
  }

  const [deployments, messageCount] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectMessage.count({ where: { projectId } }),
  ])

  return (
    <div className="px-8 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">About</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {project.description || "No description provided yet."}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="mt-1 text-sm text-foreground">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last updated</p>
                <p className="mt-1 text-sm text-foreground">{new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Workspace</p>
                <p className="mt-1 text-sm text-foreground">{project.workspace?.name ?? project.workspaceId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-sm text-foreground capitalize">{project.status}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Recent Deployments</h2>
            {deployments.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {deployments.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", deployStatusColors[dep.status ?? "building"])}
                      >
                        {dep.status ?? "building"}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">{dep.commit || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={dep.url ?? `https://${dep.slug}.masidy.app`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {(dep.url ?? `https://${dep.slug}.masidy.app`).replace("https://", "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No deployments yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="w-full justify-start" variant="outline" size="sm">
                <Link href={`/app/projects/${projectId}/ide`}>
                  <Code className="mr-2 h-4 w-4" />
                  Open IDE
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline" size="sm">
                <Link href={`/app/projects/${projectId}/sandbox`}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Test in Sandbox
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" size="sm">
                <Link href={`/app/projects/${projectId}/deployments`}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy Live
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Usage</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">AI Messages</span>
                <span className="text-sm font-medium text-foreground">{messageCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (messageCount / 500) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Deployments</span>
                <span className="text-sm font-medium text-foreground">{deployments.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, deployments.length * 10)}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Activity</h2>
            <div className="mt-4 flex flex-col gap-3">
              {deployments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                deployments.slice(0, 5).map((dep) => (
                  <div key={dep.id} className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-foreground">
                        Deployed — <span className="capitalize">{dep.status}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(dep.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
