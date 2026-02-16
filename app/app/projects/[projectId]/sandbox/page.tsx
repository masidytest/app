import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { SandboxPreview } from "@/components/project/sandbox-preview"

const deployStatusStyles: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  stopped: "bg-muted text-muted-foreground border-border",
}

type ConfigJson = {
  envVars?: Record<string, string>
  files?: Record<string, string>
}

export default async function ProjectSandboxPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) notFound()

  const [deployments, versions] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.version.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, number: true, createdAt: true },
    }),
  ])

  const config = project.configJson as ConfigJson | null
  const envVars = config?.envVars ?? {}
  const hasFiles = Object.keys(config?.files ?? {}).length > 0
  const liveDeployment = deployments.find((d) => d.status === "live")

  return (
    <div className="px-8 py-8">
      {/* Live preview iframe */}
      {hasFiles && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>Interactive preview with responsive mode switching.</CardDescription>
          </CardHeader>
          <CardContent>
            <SandboxPreview projectId={projectId} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview Environment</CardTitle>
            <CardDescription>
              Live preview of your generated app. Open the IDE to build and update it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveDeployment ? (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Live URL:{" "}
                <a
                  href={liveDeployment.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {liveDeployment.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                No live deployment yet.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-2 text-sm font-medium text-foreground capitalize">{project.status}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">Files</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {Object.keys(config?.files ?? {}).length} file{Object.keys(config?.files ?? {}).length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">Versions</p>
                <p className="mt-2 text-sm font-medium text-foreground">{versions.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">Last updated</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/app/projects/${projectId}/ide`}>Open IDE</Link>
              </Button>
              {hasFiles && (
                <Button variant="outline" asChild>
                  <a
                    href={`/api/projects/${projectId}/preview`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview App
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version History</CardTitle>
            <CardDescription>Snapshots created after each AI build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions yet. Build with the AI to create snapshots.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">v{v.number}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Deployments</CardTitle>
          <CardDescription>All deployments for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No deployments yet. Use the IDE to build and deploy your app.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {deployments.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", deployStatusStyles[dep.status ?? "building"])}
                    >
                      {dep.status ?? "building"}
                    </Badge>
                    {dep.url && (
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {dep.url.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(dep.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
