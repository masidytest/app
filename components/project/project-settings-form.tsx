"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type EnvVar = { key: string; value: string }

export function ProjectSettingsForm({
  projectId,
  initialName,
  initialDescription,
  initialStatus,
  workspaceId,
  envVars: initialEnvVars,
}: {
  projectId: string
  initialName: string
  initialDescription: string
  initialStatus: string
  workspaceId: string
  envVars: EnvVar[]
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [envVars, setEnvVars] = useState<EnvVar[]>(initialEnvVars)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [savingEnv, setSavingEnv] = useState(false)

  async function saveDetails() {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Project settings saved")
      router.refresh()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function saveEnvVars(updated: EnvVar[]) {
    setSavingEnv(true)
    try {
      const envVarsObj = Object.fromEntries(updated.map((e) => [e.key, e.value]))
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configJson: { envVars: envVarsObj } }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setEnvVars(updated)
      toast.success("Environment variables saved")
    } catch {
      toast.error("Failed to save environment variables")
    } finally {
      setSavingEnv(false)
    }
  }

  function addEnvVar() {
    if (!newKey.trim()) return
    const updated = [...envVars.filter((e) => e.key !== newKey), { key: newKey.trim(), value: newValue }]
    setNewKey("")
    setNewValue("")
    saveEnvVars(updated)
  }

  function removeEnvVar(key: string) {
    saveEnvVars(envVars.filter((e) => e.key !== key))
  }

  async function deleteProject() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Project deleted")
      router.push(`/app/workspaces/${workspaceId}`)
      router.refresh()
    } catch {
      toast.error("Failed to delete project")
      setDeleting(false)
    }
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
          <CardDescription>Keep project metadata up to date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="workspace">Workspace ID</Label>
            <Input id="workspace" value={workspaceId} disabled className="opacity-60" />
          </div>
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={saveDetails} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environment Variables</CardTitle>
          <CardDescription>Runtime secrets stored with this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {envVars.map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3"
            >
              <div>
                <p className="text-xs text-muted-foreground">{item.key}</p>
                <p className="text-sm text-foreground">••••••••</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEnvVar(item.key)}
                disabled={savingEnv}
              >
                Remove
              </Button>
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="KEY_NAME"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <Input
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={addEnvVar} disabled={savingEnv || !newKey.trim()}>
              {savingEnv && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add variable
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this project</p>
            <p className="text-xs text-muted-foreground">
              This permanently removes the project, deployments, and all data.
            </p>
          </div>
          <Button variant="destructive" onClick={deleteProject} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete project
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
