import Link from "next/link"
import {
  Plus,
  MessageSquare,
  Clock,
  Rocket,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paused: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
}

type WorkspaceSummary = {
  id: string
  name: string
  plan?: string | null
  membersCount?: number
}

type ProjectSummary = {
  id: string
  name: string
  description?: string | null
  status?: string | null
  updatedAt: Date
}

export function WorkspaceContent({
  workspace,
  projects,
  recentProjectId,
  aiMessageCount = 0,
}: {
  workspace: WorkspaceSummary
  projects: ProjectSummary[]
  recentProjectId?: string | null
  aiMessageCount?: number
}) {
  const newProjectHref = `/app/workspaces/${workspace.id}/projects/new`
  const builderHref = recentProjectId ? `/app/projects/${recentProjectId}/ide` : newProjectHref

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.membersCount ?? 0} members
            {workspace.plan ? ` - ${workspace.plan.charAt(0).toUpperCase() + workspace.plan.slice(1)} plan` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={builderHref}>
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Chat with Builder
            </Link>
          </Button>
          <Button asChild>
            <Link href={newProjectHref}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create New App
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Active Projects</p>
          <p className="mt-1 text-xl font-bold text-foreground">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Deployments</p>
          <p className="mt-1 text-xl font-bold text-foreground">{projects.filter((p) => p.status === "live").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">AI Messages</p>
          <p className="mt-1 text-xl font-bold text-foreground">{aiMessageCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Members</p>
          <p className="mt-1 text-xl font-bold text-foreground">{workspace.membersCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <div className="mt-4 flex flex-col gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                  {project.status && (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", statusColors[project.status] ?? statusColors.draft)}
                    >
                      {project.status}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.description || "No description provided yet."}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No projects yet. Create one to get started.</p>
            <Button className="mt-4" size="sm" asChild>
              <Link href={newProjectHref}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create New App
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Create a project to get started.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-sm text-foreground">
                    Updated <span className="font-medium">{project.name}</span>
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

