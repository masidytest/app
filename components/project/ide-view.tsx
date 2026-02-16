"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  FileCode,
  FileText,
  Bot,
  Send,
  Rocket,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
  ExternalLink,
  Eye,
  Code2,
  ChevronRight,
  File,
  FolderOpen,
  Plus,
  Square,
  CheckCircle2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(name: string) {
  if (name.endsWith(".html")) return <FileCode className="h-3.5 w-3.5 text-orange-400" />
  if (name.endsWith(".css")) return <FileCode className="h-3.5 w-3.5 text-blue-400" />
  if (name.endsWith(".js") || name.endsWith(".ts")) return <FileCode className="h-3.5 w-3.5 text-yellow-400" />
  if (name.endsWith(".md")) return <FileText className="h-3.5 w-3.5 text-gray-400" />
  return <File className="h-3.5 w-3.5 text-gray-400" />
}

/**
 * Robust line-by-line file parser.
 * Handles FILE: prefix blocks AND bare ```html fallback.
 */
function parseFiles(text: string): Record<string, string> {
  const files: Record<string, string> = {}
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""))

  let currentFile: string | null = null
  let inCodeBlock = false
  const contentLines: string[] = []

  for (const line of lines) {
    // Detect FILE: marker (only outside a code block)
    if (!inCodeBlock) {
      const fileMatch = line.match(/^FILE:\s*(\S+)/)
      if (fileMatch) {
        // Save the previous file if any
        if (currentFile !== null) {
          files[currentFile] = contentLines.join("\n")
        }
        currentFile = fileMatch[1]
        contentLines.length = 0
        inCodeBlock = false
        continue
      }
    }

    if (currentFile !== null) {
      // Opening code fence — skip the fence line itself
      if (!inCodeBlock && line.trimStart().startsWith("```")) {
        inCodeBlock = true
        continue
      }
      // Closing code fence — save file and reset
      if (inCodeBlock && line.trimStart() === "```") {
        files[currentFile] = contentLines.join("\n")
        currentFile = null
        inCodeBlock = false
        contentLines.length = 0
        continue
      }
      if (inCodeBlock) {
        contentLines.push(line)
      }
    }
  }

  // Save last file if stream ended before closing fence
  if (currentFile !== null && contentLines.length > 0) {
    files[currentFile] = contentLines.join("\n")
  }

  // Fallback: grab any ```html block without a FILE: prefix
  if (Object.keys(files).length === 0) {
    const idx = text.indexOf("```html")
    if (idx !== -1) {
      const after = text.slice(idx + 7) // skip ```html
      const newline = after.indexOf("\n")
      const end = after.indexOf("\n```", newline + 1)
      if (newline !== -1 && end !== -1) {
        files["index.html"] = after.slice(newline + 1, end)
      }
    }
  }

  return files
}

function parsePlan(text: string): string[] {
  const planMatch = text.match(/📋 Plan:\n((?:•[^\n]+\n?)+)/)
  if (!planMatch) return []
  return planMatch[1]
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => l.replace(/^•\s*/, "").replace(/^Step \d+:\s*/i, "").trim())
    .filter(Boolean)
}

/** Returns the filename currently being written (FILE block not yet closed). */
function getCurrentBuildingFile(text: string): string | null {
  const lines = text.split("\n")
  let lastFile: string | null = null
  let inBlock = false
  for (const line of lines) {
    const trimmed = line.replace(/\r$/, "").trimStart()
    if (!inBlock) {
      const m = line.match(/^FILE:\s*(\S+)/)
      if (m) { lastFile = m[1]; inBlock = false; continue }
      if (lastFile !== null && trimmed.startsWith("```")) { inBlock = true; continue }
    } else {
      if (trimmed === "```") { lastFile = null; inBlock = false }
    }
  }
  // If lastFile is set and we never saw the closing fence, it's still being written
  return lastFile
}

/**
 * Returns only the descriptive text (before any FILE: or code fence).
 * Strips the plan section — that's rendered separately in the step UI.
 */
function cleanForDisplay(text: string): string {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""))
  const displayLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trimStart()
    // Stop at first FILE: marker or opening code fence
    if (trimmed.startsWith("FILE:") || trimmed.startsWith("```")) break
    displayLines.push(line)
  }
  return displayLines
    .join("\n")
    .replace(/📋 Plan:[\s\S]*$/, "") // remove plan block and everything after
    .replace(/\[NOVA_READY\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ── file tree ─────────────────────────────────────────────────────────────────

type TreeNode = {
  name: string
  path: string // full path relative to project root
  type: "file" | "folder"
  children: TreeNode[]
}

function buildTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  function ensureFolder(parts: string[]): TreeNode[] {
    if (parts.length === 0) return root
    const fullPath = parts.join("/")
    if (folderMap.has(fullPath)) return folderMap.get(fullPath)!.children
    const parent = ensureFolder(parts.slice(0, -1))
    const node: TreeNode = {
      name: parts[parts.length - 1],
      path: fullPath,
      type: "folder",
      children: [],
    }
    parent.push(node)
    folderMap.set(fullPath, node)
    return node.children
  }

  for (const filePath of Object.keys(files).sort()) {
    const parts = filePath.split("/")
    const parentParts = parts.slice(0, -1)
    const container = ensureFolder(parentParts)
    container.push({
      name: parts[parts.length - 1],
      path: filePath,
      type: "file",
      children: [],
    })
  }

  return root
}

function FileTreeNode({
  node,
  selectedFile,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  depth = 0,
}: {
  node: TreeNode
  selectedFile: string | null
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  onSelectFile: (path: string) => void
  depth?: number
}) {
  const indent = depth * 12

  if (node.type === "folder") {
    const open = expandedFolders.has(node.path)
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          style={{ paddingLeft: indent + 8 }}
          className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg
            className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <FolderOpen className={cn("h-3.5 w-3.5 shrink-0", open ? "text-amber-400" : "text-muted-foreground")} />
          <span className="truncate font-mono">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: indent + 8 }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-xs transition-colors",
        selectedFile === node.path
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {getFileIcon(node.name)}
      <span className="truncate font-mono">{node.name}</span>
    </button>
  )
}

// ── models ────────────────────────────────────────────────────────────────────

const AI_MODELS = [
  { id: "claude-sonnet-4-5-20250929", label: "Sonnet 4.5", desc: "Balanced" },
  { id: "claude-opus-4-6", label: "Opus 4.6", desc: "Most capable" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Fast & cheap" },
] as const

// ── types ─────────────────────────────────────────────────────────────────────

type AIMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  hasFiles?: boolean
  plan?: string[]
}

// ── component ─────────────────────────────────────────────────────────────────

export function IDEView({
  projectId,
  initialMessages,
  initialFiles,
}: {
  projectId: string
  initialMessages: AIMessage[]
  initialFiles: Record<string, string>
}) {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages)
  const [files, setFiles] = useState<Record<string, string>>(initialFiles)
  const [selectedFile, setSelectedFile] = useState<string | null>(
    Object.keys(initialFiles)[0] ?? null
  )
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
  const [currentBuildingFile, setCurrentBuildingFile] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [centerView, setCenterView] = useState<"preview" | "code">("preview")
  const [previewHtml, setPreviewHtml] = useState<string>(initialFiles["index.html"] ?? "")
  // During streaming: use srcDoc for real-time. After saving: use API URL for multi-page nav.
  const [previewSrc, setPreviewSrc] = useState<"srcDoc" | "api">(
    initialFiles["index.html"] ? "api" : "srcDoc"
  )
  const [previewKey, setPreviewKey] = useState(0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [liveUrl, setLiveUrl] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5-20250929")
  const [chatWidth, setChatWidth] = useState(340)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand all folders from initial files
    const folders = new Set<string>()
    Object.keys(initialFiles).forEach((p) => {
      const parts = p.split("/")
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join("/"))
      }
    })
    return folders
  })

  const searchParams = useSearchParams()
  const autoStartedRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── drag to resize chat panel ─────────────────────────────────────────────

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: chatWidth }

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const delta = dragRef.current.startX - ev.clientX
        setChatWidth(Math.max(260, Math.min(580, dragRef.current.startWidth + delta)))
      }
      const onUp = () => {
        dragRef.current = null
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
      }
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    },
    [chatWidth]
  )

  // ── send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!userContent || isStreaming) return

      // Capture existing files BEFORE streaming — used to merge later
      const existingFiles = { ...files }

      const userMsg: AIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      const assistantId = `assistant-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() },
      ])
      setIsStreaming(true)
      setStreamingMsgId(assistantId)

      try {
        const controller = new AbortController()
        abortRef.current = controller

        const response = await fetch(`/api/projects/${projectId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userContent, model: selectedModel }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`Server error ${response.status}`)

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ""
        let completedFileCount = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })

          // Update message content in real time
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
          )

          // Track which file is currently being written
          const buildingFile = getCurrentBuildingFile(fullText)
          setCurrentBuildingFile(buildingFile)

          // Extract plan as it streams in
          const partialPlan = parsePlan(fullText)
          if (partialPlan.length > 0) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, plan: partialPlan } : m))
            )
          }

          // Real-time: update file tree + srcDoc preview when new complete files appear
          const partialFiles = parseFiles(fullText)
          const newCount = Object.keys(partialFiles).length
          if (newCount > completedFileCount) {
            completedFileCount = newCount
            // Merge with existing files — don't replace them
            const mergedPartial = { ...existingFiles, ...partialFiles }
            setFiles(mergedPartial)

            // Auto-expand folders for any new files
            setExpandedFolders((prev) => {
              const next = new Set(prev)
              Object.keys(mergedPartial).forEach((p) => {
                const parts = p.split("/")
                for (let i = 1; i < parts.length; i++) {
                  next.add(parts.slice(0, i).join("/"))
                }
              })
              return next
            })

            if (!selectedFile || !partialFiles[selectedFile]) {
              setSelectedFile(Object.keys(partialFiles)[0])
            }
            // Real-time srcDoc preview for index.html during streaming
            if (partialFiles["index.html"]) {
              setPreviewHtml(partialFiles["index.html"])
              setPreviewSrc("srcDoc")
              setPreviewKey((k) => k + 1)
            }
          }
        }

        // ── stream finished ────────────────────────────────────────────────
        setCurrentBuildingFile(null)

        const cleanText = fullText.replace("[NOVA_READY]", "").trim()
        const newFiles = parseFiles(cleanText)
        const plan = parsePlan(cleanText)
        const hasFiles = Object.keys(newFiles).length > 0

        if (hasFiles) {
          // Merge new/modified files with existing files
          const mergedFiles = { ...existingFiles, ...newFiles }

          // Persist merged files to DB
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ configJson: { files: mergedFiles }, status: "building" }),
          })
          setFiles(mergedFiles)

          // Expand all folders from the final file set
          setExpandedFolders((prev) => {
            const next = new Set(prev)
            Object.keys(mergedFiles).forEach((p) => {
              const parts = p.split("/")
              for (let i = 1; i < parts.length; i++) {
                next.add(parts.slice(0, i).join("/"))
              }
            })
            return next
          })

          if (!selectedFile || !mergedFiles[selectedFile]) {
            setSelectedFile(Object.keys(mergedFiles)[0])
          }
          // Switch to API URL preview so multi-page navigation + CSS/JS files work
          setPreviewSrc("api")
          setPreviewKey((k) => k + 1)
        }

        // Store the CLEANED content so the render never shows raw code
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: cleanForDisplay(cleanText), hasFiles, plan }
              : m
          )
        )
      } catch (err: unknown) {
        setCurrentBuildingFile(null)
        if ((err as Error).name === "AbortError") {
          // User stopped — clean whatever was generated so far
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m
              const cleaned = cleanForDisplay(m.content)
              return { ...m, content: cleaned || "Generation stopped." }
            })
          )
        } else {
          console.error("Chat error:", err)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, something went wrong. Please try again." }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        setStreamingMsgId(null)
        setCurrentBuildingFile(null)
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming, projectId, selectedFile, selectedModel, files]
  )

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || isStreaming) return
    setInput("")
    await sendMessage(content)
  }, [input, isStreaming, sendMessage])

  // Auto-send prompt when ?autostart=1
  useEffect(() => {
    if (autoStartedRef.current) return
    if (searchParams.get("autostart") !== "1") return
    const prompt = localStorage.getItem("nova_autostart_prompt")
    if (!prompt) return
    autoStartedRef.current = true
    localStorage.removeItem("nova_autostart_prompt")
    setTimeout(() => sendMessage(prompt), 800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── deploy ────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (Object.keys(files).length === 0) {
      toast.error("Nothing to deploy yet", {
        description: "Ask the AI to build something first.",
      })
      return
    }
    setIsDeploying(true)
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, baseUrl: window.location.origin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Deploy failed")
      const url: string = data.deployment.url
      setLiveUrl(url)
      toast.success("Deployed!", {
        description: url,
        action: { label: "Open", onClick: () => window.open(url, "_blank") },
        duration: 10000,
      })
    } catch (err) {
      toast.error("Deployment failed", { description: String(err) })
    } finally {
      setIsDeploying(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const fileList = Object.keys(files)
  const fileTree = buildTree(files)

  function handleToggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function handleSelectFile(path: string) {
    setSelectedFile(path)
    setCenterView("code")
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden bg-background">

      {/* ── Left: File Tree ── */}
      {leftOpen && (
        <div className="w-52 shrink-0 border-r border-border bg-card/50 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </span>
              {isStreaming && fileList.length > 0 && (
                <span className="text-[9px] text-amber-400 font-medium animate-pulse">
                  updating
                </span>
              )}
            </div>
            <button
              onClick={() => setLeftOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5">
            {fileList.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Plus className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No files yet.{" "}
                  <span className="text-primary/70">Ask the AI to build your app.</span>
                </p>
              </div>
            ) : (
              <div>
                {fileTree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    selectedFile={selectedFile}
                    expandedFolders={expandedFolders}
                    onToggleFolder={handleToggleFolder}
                    onSelectFile={handleSelectFile}
                  />
                ))}
              </div>
            )}
          </div>

          {liveUrl && (
            <div className="border-t border-border p-3">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors truncate"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                Live
                <ExternalLink className="h-2.5 w-2.5 shrink-0 ml-auto" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Center: Preview / Code ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border bg-card/50 px-3 py-2 gap-2">
          <div className="flex items-center gap-2">
            {!leftOpen && (
              <button
                onClick={() => setLeftOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                onClick={() => setCenterView("preview")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  centerView === "preview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
              <button
                onClick={() => setCenterView("code")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  centerView === "code"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>
            </div>

            {centerView === "preview" && (
              <div className="flex items-center gap-1 ml-1">
                {(
                  [
                    { mode: "desktop", Icon: Monitor },
                    { mode: "tablet", Icon: Tablet },
                    { mode: "mobile", Icon: Smartphone },
                  ] as const
                ).map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={cn(
                      "p-1 rounded",
                      previewMode === mode
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Force reload: for API mode, re-fetch from server
                    setPreviewKey((k) => k + 1)
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground ml-0.5"
                  title="Refresh preview"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {centerView === "code" && selectedFile && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                <ChevronRight className="h-3 w-3" />
                <span className="font-mono">{selectedFile}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleDeploy}
              disabled={isDeploying || fileList.length === 0}
            >
              {isDeploying ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Rocket className="mr-1 h-3 w-3" />
              )}
              Deploy
            </Button>
            {!rightOpen && (
              <button
                onClick={() => setRightOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Preview:
            - During streaming: srcDoc (real-time, no DB round-trip)
            - After streaming: API URL (multi-page nav, CSS/JS files all work) */}
        {centerView === "preview" && (
          <div className="flex-1 flex items-center justify-center bg-muted/20 p-4 overflow-hidden">
            {fileList.length > 0 ? (
              <div
                className={cn(
                  "h-full rounded-lg border border-border overflow-hidden shadow-lg transition-all duration-200",
                  previewMode === "desktop" && "w-full",
                  previewMode === "tablet" && "w-[768px] max-w-full",
                  previewMode === "mobile" && "w-[375px] max-w-full"
                )}
              >
                {previewSrc === "srcDoc" ? (
                  <iframe
                    key={`srcDoc-${previewKey}`}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : (
                  <iframe
                    key={`api-${previewKey}`}
                    src={`/api/projects/${projectId}/preview`}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Preview will appear here once the AI builds your app.</p>
              </div>
            )}
          </div>
        )}

        {/* Code viewer */}
        {centerView === "code" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedFile && files[selectedFile] ? (
              <div className="flex-1 overflow-auto bg-[#0d1117]">
                <pre className="p-5 text-xs leading-relaxed font-mono text-gray-300 whitespace-pre-wrap break-words min-h-full">
                  <code>{files[selectedFile]}</code>
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a file to view its code.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drag handle to resize chat ── */}
      {rightOpen && (
        <div
          onMouseDown={onDragHandleMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary/70 transition-colors"
          title="Drag to resize"
        />
      )}

      {/* ── Right: AI Chat ── */}
      {rightOpen && (
        <div
          style={{ width: chatWidth }}
          className="shrink-0 border-l border-border bg-card/50 flex flex-col min-w-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">AI Builder</span>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 truncate min-w-0">
                  <Zap className="h-2.5 w-2.5 animate-pulse shrink-0" />
                  <span className="truncate font-mono">
                    {currentBuildingFile ? currentBuildingFile : "thinking…"}
                  </span>
                </span>
              )}
            </div>
            {/* Model selector */}
            <div className="shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isStreaming}
                className="h-6 rounded-md border border-border bg-muted/50 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 cursor-pointer appearance-none pr-5"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.desc}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isStreaming && (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/20"
                  title="Stop generation"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  Stop
                </button>
              )}
              <button
                onClick={() => setRightOpen(false)}
                className="text-muted-foreground hover:text-foreground ml-0.5"
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Describe your app idea and the AI will build it step by step, updating files and the preview in real time.
              </div>
            ) : (
              messages.map((msg) => {
                const isThisStreaming = isStreaming && msg.id === streamingMsgId
                const displayText =
                  msg.role === "assistant" && msg.content
                    ? cleanForDisplay(msg.content)
                    : msg.content
                const isGenerating =
                  msg.role === "assistant" && msg.content === "" && isThisStreaming
                const plan =
                  msg.plan ??
                  (msg.role === "assistant" ? parsePlan(msg.content) : [])

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[92%] rounded-xl px-3 py-2.5 text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {isGenerating ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Analyzing your request…</span>
                        </div>
                      ) : displayText ? (
                        displayText.split("\n").map((line, i, arr) => (
                          <span key={i}>
                            {line}
                            {i < arr.length - 1 && <br />}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">…</span>
                      )}
                    </div>

                    {/* Workflow steps */}
                    {msg.role === "assistant" && plan.length > 0 && (
                      <div className="mt-2 w-full max-w-[96%] rounded-lg border border-border bg-card/70 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {isThisStreaming ? "Building…" : "Completed"}
                        </p>
                        <div className="space-y-1.5">
                          {plan.map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {isThisStreaming ? (
                                <div className="mt-0.5 h-3 w-3 rounded-full border border-muted-foreground/30 bg-muted animate-pulse shrink-0" />
                              ) : (
                                <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-400 shrink-0" />
                              )}
                              <span
                                className={
                                  isThisStreaming ? "text-muted-foreground" : "text-foreground"
                                }
                              >
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Currently writing indicator */}
                        {isThisStreaming && currentBuildingFile && (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-[10px] text-amber-400">
                            <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                            <span>Writing </span>
                            <span className="font-mono font-semibold">{currentBuildingFile}</span>
                            <span>…</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* File badges */}
                    {msg.hasFiles && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {fileList.map((name) => (
                          <button
                            key={name}
                            onClick={() => {
                              setSelectedFile(name)
                              setCenterView("code")
                            }}
                            className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            {getFileIcon(name)}
                            {name}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setCenterView("preview")
                            setPreviewKey((k) => k + 1)
                          }}
                          className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <Eye className="h-2.5 w-2.5" />
                          View preview
                        </button>
                      </div>
                    )}

                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={
                  isStreaming
                    ? "AI is building… type your next message"
                    : "Ask for changes or describe what to build…"
                }
                rows={2}
                className="flex-1 resize-none rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <Button
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
