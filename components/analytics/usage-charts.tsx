"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BarChart3, MessageSquare, FolderKanban, Rocket } from "lucide-react"

type DailyData = { date: string; messages: number }
type ProjectData = { projectId: string; name: string; messages: number }
type Totals = { messages: number; projects: number; deployments: number }

type AnalyticsData = {
  daily: DailyData[]
  perProject: ProjectData[]
  totals: Totals
}

export function UsageCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics?days=30")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
  }

  const maxMessages = Math.max(...data.daily.map((d) => d.messages), 1)
  const maxProjectMessages = Math.max(...(data.perProject.map((p) => p.messages) || [1]), 1)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totals.messages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">AI messages (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <FolderKanban className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totals.projects}</p>
                <p className="text-xs text-muted-foreground">Total projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Rocket className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totals.deployments}</p>
                <p className="text-xs text-muted-foreground">Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily messages bar chart (CSS-based, no dependency) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            AI Messages per Day (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[2px] h-40">
            {data.daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 group relative"
                title={`${d.date}: ${d.messages} messages`}
              >
                <div
                  className="w-full bg-primary/60 hover:bg-primary rounded-t transition-colors"
                  style={{ height: `${Math.max((d.messages / maxMessages) * 100, 2)}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap shadow-lg z-10">
                  {d.date}: {d.messages}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{data.daily[0]?.date}</span>
            <span>{data.daily[data.daily.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-project usage */}
      {data.perProject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Usage by Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.perProject.map((p) => (
              <div key={p.projectId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium truncate">{p.name}</span>
                  <span className="text-muted-foreground">{p.messages} msgs</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-blue-500/60 transition-all"
                    style={{ width: `${(p.messages / maxProjectMessages) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
