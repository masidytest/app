"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Database, Zap, HardDrive, Shield } from "lucide-react"

const ICONS: Record<string, React.ElementType> = {
  database: Database,
  zap: Zap,
  "hard-drive": HardDrive,
  shield: Shield,
}

type ServiceDef = {
  type: string
  name: string
  description: string
  icon: string
}

type ActiveService = {
  id: string
  type: string
  name: string
  status: string
}

export function ServiceCards({
  definitions,
  active,
  projectId,
}: {
  definitions: ServiceDef[]
  active: ActiveService[]
  projectId: string
}) {
  const [provisioning, setProvisioning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeTypes = new Set(active.map((s) => s.type))

  async function handleProvision(type: string) {
    setProvisioning(type)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        setError(data.error || "Failed to provision service")
      }
    } catch {
      setError("Failed to provision service")
    } finally {
      setProvisioning(null)
    }
  }

  async function handleRemove(type: string) {
    setRemoving(type)
    try {
      await fetch(`/api/projects/${projectId}/services`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      window.location.reload()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((def) => {
          const isActive = activeTypes.has(def.type)
          const Icon = ICONS[def.icon] ?? Database

          return (
            <div
              key={def.type}
              className={`rounded-lg border p-4 transition-colors ${
                isActive
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-md p-2 ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{def.name}</p>
                    {isActive && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
                  <div className="mt-3">
                    {isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(def.type)}
                        disabled={removing === def.type}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        {removing === def.type ? "Removing..." : "Remove"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleProvision(def.type)}
                        disabled={provisioning === def.type}
                      >
                        {provisioning === def.type ? "Setting up..." : "Enable"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
