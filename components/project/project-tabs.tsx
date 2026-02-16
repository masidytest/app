"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Overview", href: "" },
  { label: "IDE", href: "/ide" },
  { label: "Sandbox", href: "/sandbox" },
  { label: "Deployments", href: "/deployments" },
  { label: "Domains", href: "/domains" },
  { label: "Services", href: "/services" },
  { label: "Logs", href: "/logs" },
  { label: "Settings", href: "/settings" },
]

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const basePath = `/app/projects/${projectId}`

  return (
    <div className="border-b border-border bg-card/50">
      <div className="flex gap-0 overflow-x-auto px-8">
        {tabs.map((tab) => {
          const tabHref = basePath + tab.href
          const isActive =
            tab.href === ""
              ? pathname === basePath
              : pathname.startsWith(tabHref)

          return (
            <Link
              key={tab.label}
              href={tabHref}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
