"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const EXAMPLES = [
  "A SaaS dashboard for tracking monthly subscriptions and revenue",
  "A landing page for a mobile fitness app with pricing and testimonials",
  "A todo app with kanban board, priorities, and dark mode",
  "An invoice generator with PDF export and client management",
]

async function createProjectAndRedirect(
  prompt: string,
  workspaceId: string,
  router: ReturnType<typeof useRouter>
) {
  const projectRes = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: prompt.slice(0, 60),
      description: prompt,
      workspaceId,
    }),
  })
  if (!projectRes.ok) throw new Error("Failed to create project")
  const projectData = await projectRes.json()
  const projectId: string = projectData.project.id
  localStorage.setItem("nova_autostart_prompt", prompt)
  router.push(`/app/projects/${projectId}/ide?autostart=1`)
}

export function HeroSection() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    const text = prompt.trim()
    if (!text) return
    setLoading(true)
    try {
      // Check if user is already logged in
      const meRes = await fetch("/api/users/me")
      if (meRes.ok) {
        const meData = await meRes.json()
        const workspaceId: string | null = meData.primaryWorkspaceId
        if (workspaceId) {
          await createProjectAndRedirect(text, workspaceId, router)
          return
        }
        // Logged in but no workspace — go to app
        router.push("/app")
        return
      }
      // Not logged in — save prompt and redirect to signup
      localStorage.setItem("nova_pending_prompt", text)
      router.push("/signup")
    } catch {
      // Fallback: treat as unauthenticated
      localStorage.setItem("nova_pending_prompt", text)
      router.push("/signup")
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(199_89%_48%/0.08),transparent_60%)]" />
      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center md:pt-32 md:pb-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">AI-Powered App Builder</span>
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Describe it.{" "}
          <span className="text-primary">We build</span>{" "}
          the AI SaaS.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          Tell our AI what you want to build. It codes, previews, and deploys your app — no coding required.
        </p>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-xl border border-border bg-card p-2 shadow-lg shadow-primary/5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleStart()
                }
              }}
              placeholder="Describe what you want to build… e.g. 'A SaaS dashboard for tracking revenue'"
              rows={3}
              className="w-full resize-none rounded-lg bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Press Enter or click to start building
              </p>
              <Button
                size="sm"
                className="ml-auto"
                onClick={handleStart}
                disabled={!prompt.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Build with AI
                {!loading && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Example prompts */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
