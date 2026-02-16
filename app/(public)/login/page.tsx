"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Zap, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("masidy_pending_prompt")
    if (saved) setPendingPrompt(saved)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Login failed"); return }

      // Check for a pending build prompt saved from the landing page
      const pending = localStorage.getItem("masidy_pending_prompt")
      const workspaceId: string | null | undefined = data.workspaceId

      if (pending && workspaceId) {
        localStorage.removeItem("masidy_pending_prompt")

        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pending.slice(0, 60),
            description: pending,
            workspaceId,
          }),
        })

        if (projectRes.ok) {
          const projectData = await projectRes.json()
          const projectId: string = projectData.project.id
          localStorage.setItem("masidy_autostart_prompt", pending)
          router.push(`/app/projects/${projectId}/ide?autostart=1`)
          router.refresh()
          return
        }
      }

      router.push("/app")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {pendingPrompt ? "Log in to start building your app" : "Log in to your Masidy account"}
        </p>
        {pendingPrompt && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">Your idea is saved</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{pendingPrompt}</p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <Button className="mt-2 w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"Don't have an account? "}<Link href="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
