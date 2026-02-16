"use client"

import { useState, useEffect } from "react"
import { RotateCcw, Clock } from "lucide-react"

type VersionEntry = {
  id: string
  number: number
  createdAt: string
}

export function VersionHistory({
  projectId,
  onRollback,
}: {
  projectId: string
  onRollback?: () => void
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/versions?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setVersions(data.versions ?? []))
      .finally(() => setLoading(false))
  }, [projectId])

  async function handleRollback(versionId: string) {
    if (!confirm("Rollback to this version? Current files will be replaced.")) return
    setRollingBack(versionId)
    try {
      const res = await fetch(`/api/versions/${versionId}/rollback`, { method: "POST" })
      if (res.ok) {
        onRollback?.()
      }
    } finally {
      setRollingBack(null)
    }
  }

  if (loading) {
    return <p className="text-xs text-zinc-500 px-3 py-2">Loading versions…</p>
  }

  if (versions.length === 0) {
    return <p className="text-xs text-zinc-500 px-3 py-2">No versions yet.</p>
  }

  return (
    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
      {versions.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-zinc-800/50 rounded group"
        >
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="h-3 w-3" />
            <span className="text-zinc-300">v{v.number}</span>
            <span>{new Date(v.createdAt).toLocaleString()}</span>
          </div>
          <button
            onClick={() => handleRollback(v.id)}
            disabled={rollingBack === v.id}
            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 transition-opacity"
            title="Rollback to this version"
          >
            <RotateCcw className={`h-3 w-3 ${rollingBack === v.id ? "animate-spin" : ""}`} />
          </button>
        </div>
      ))}
    </div>
  )
}
