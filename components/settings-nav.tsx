"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Account", href: "/app/settings/account" },
  { label: "Billing", href: "/app/settings/billing" },
  { label: "API Keys", href: "/app/settings/api" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <div className="mt-6 border-b border-border">
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-3 py-2 text-sm transition-colors border-b-2",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
