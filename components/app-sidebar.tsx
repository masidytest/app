"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  Rocket,
  Database,
  CreditCard,
  Settings,
  User,
  Key,
  ChevronDown,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type WorkspaceSummary = {
  id: string
  name: string
  plan?: string | null
  membersCount?: number
}

type UserSummary = {
  name?: string | null
  email?: string | null
}

export function AppSidebar({
  workspaces,
  activeWorkspaceId,
  recentProjectId,
  user,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId?: string | null
  recentProjectId?: string | null
  user?: UserSummary | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [wsOpen, setWsOpen] = useState(true)

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }
  const createWorkspaceHref = "/app/workspaces/new"
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]
  const workspaceId = activeWorkspace?.id
  const workspaceName = activeWorkspace?.name ?? "No workspace"
  const ideHref = recentProjectId
    ? `/app/projects/${recentProjectId}/ide`
    : workspaceId
      ? `/app/workspaces/${workspaceId}/projects/new`
      : createWorkspaceHref

  const mainNav = [
    { label: "Dashboard", href: "/app", icon: LayoutDashboard },
    {
      label: "Projects",
      href: workspaceId ? `/app/workspaces/${workspaceId}` : createWorkspaceHref,
      icon: FolderKanban,
    },
  ]

  const workspaceNav = [
    {
      label: "Projects",
      href: workspaceId ? `/app/workspaces/${workspaceId}` : createWorkspaceHref,
      icon: FolderKanban,
    },
    { label: "IDE", href: ideHref, icon: LayoutDashboard },
    {
      label: "Deployments",
      href: workspaceId ? `/app/workspaces/${workspaceId}/deployments` : createWorkspaceHref,
      icon: Rocket,
    },
    {
      label: "Data",
      href: workspaceId ? `/app/workspaces/${workspaceId}/data` : createWorkspaceHref,
      icon: Database,
    },
    { label: "Settings", href: "/app/settings/account", icon: Settings },
  ]

  const accountNav = [
    { label: "Account", href: "/app/settings/account", icon: User },
    { label: "Billing", href: "/app/settings/billing", icon: CreditCard },
    { label: "API Keys", href: "/app/settings/api", icon: Key },
  ]

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <Link href="/app" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-sidebar-foreground">NovaBuilder</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-1">
          {mainNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setWsOpen(!wsOpen)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50"
          >
            Workspace
            <ChevronDown className={cn("h-3 w-3 transition-transform", !wsOpen && "-rotate-90")} />
          </button>
          {wsOpen && (
            <div className="mt-1 flex flex-col gap-1">
              {workspaceNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    pathname === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Account
          </p>
          <div className="mt-1 flex flex-col gap-1">
            {accountNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 flex flex-col gap-1">
        <Link
          href="/app/settings/account"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">
              {user?.name || user?.email || "Account"}
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">{workspaceName}</span>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/80"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  )
}
