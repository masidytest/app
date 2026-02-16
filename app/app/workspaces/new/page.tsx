"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateWorkspaceResponse = {
  workspace: {
    id: string
  }
}

export default function NewWorkspacePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError("Workspace name is required.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        const message = typeof payload?.error === "string" ? payload.error : "Failed to create workspace."
        throw new Error(message)
      }

      const data = (await res.json()) as CreateWorkspaceResponse
      router.push(`/app/workspaces/${data.workspace.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Create Workspace</CardTitle>
          <CardDescription>Workspaces help organize projects and deployments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Nova Labs"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Workspace"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
