"use client"

import { useState } from "react"
import { Monitor, Tablet, Smartphone, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function SandboxPreview({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [key, setKey] = useState(0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {(
          [
            { m: "desktop", Icon: Monitor },
            { m: "tablet", Icon: Tablet },
            { m: "mobile", Icon: Smartphone },
          ] as const
        ).map(({ m, Icon }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "p-1.5 rounded",
              mode === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button
          onClick={() => setKey((k) => k + 1)}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-center bg-muted/20 rounded-lg p-4">
        <div
          className={cn(
            "rounded-lg border border-border overflow-hidden shadow-lg transition-all duration-200",
            mode === "desktop" && "w-full h-[500px]",
            mode === "tablet" && "w-[768px] max-w-full h-[500px]",
            mode === "mobile" && "w-[375px] max-w-full h-[500px]"
          )}
        >
          <iframe
            key={key}
            src={`/api/projects/${projectId}/preview`}
            className="w-full h-full border-0"
            title="Sandbox Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  )
}
