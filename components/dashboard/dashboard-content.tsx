import Link from "next/link"
import { Plus, ArrowRight, MessageSquare, Clock, Rocket, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BuildPromptInput } from "./build-prompt-input"

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

export function DashboardContent({
  workspaces,
  projects,
  projectCount,
  liveProjectCount,
  aiMessageCount,
  primaryWorkspaceId,
  userName,
}: {
  workspaces: WorkspaceSummary[]
  projects: ProjectSummary[]
  projectCount: number
  liveProjectCount: number
  aiMessageCount: number
  primaryWorkspaceId?: string | null
  userName?: string | null
}) {
  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, {userName ?? "there"}. Here is an overview of your work.</p>
        </div>
        <Button asChild>
          <Link href={primaryWorkspaceId ? `/app/workspaces/${primaryWorkspaceId}/projects/new` : "/app/workspaces/new"}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderKanban className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Projects</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{projectCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Live Deployments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{liveProjectCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">AI Messages</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{aiMessageCount}</p>
        </div>
      </div>

      {primaryWorkspaceId && (
        <BuildPromptInput primaryWorkspaceId={primaryWorkspaceId} />
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Workspaces</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No workspaces yet. Create one to get started.
              <div className="mt-4">
                <Button size="sm" asChild>
                  <Link href="/app/workspaces/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Workspace
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/app/workspaces/${ws.id}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{ws.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ws.membersCount ?? 0} members
                    {ws.plan ? ` - ${ws.plan.charAt(0).toUpperCase() + ws.plan.slice(1)} plan` : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
          <Link
            href={primaryWorkspaceId ? `/app/workspaces/${primaryWorkspaceId}` : "/app/workspaces/new"}
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No projects yet. Create one to see activity here.
            </div>
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
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
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {project.description || "No description provided yet."}
                </p>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

