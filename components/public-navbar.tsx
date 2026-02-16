"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">NovaBuilder</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/changelog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Changelog
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/app">Get Started</Link>
          </Button>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Docs
            </Link>
            <Link href="/changelog" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Changelog
            </Link>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/app">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
