// Serve live project preview — injects a <base> tag so all relative links
// (CSS, JS, images, other pages) resolve through the preview API.
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const EMPTY_PREVIEW = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Masidy Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-950 flex items-center justify-center">
  <div class="text-center px-6">
    <div class="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-violet-500/20">
      <svg class="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    </div>
    <h1 class="text-white text-xl font-semibold mb-3">Masidy</h1>
    <p class="text-gray-400 text-sm max-w-sm leading-relaxed">
      Describe the app you want to build in the chat panel and the AI will generate it here in real time.
    </p>
    <div class="mt-6 flex items-center justify-center gap-2 text-gray-600 text-xs">
      <div class="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
      Waiting for your first message
    </div>
  </div>
</body>
</html>`

type ConfigJson = {
  files?: Record<string, string>
  htmlContent?: string
}

/** Inject a <base> tag into HTML so relative URLs resolve via the preview API. */
function injectBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`)
  }
  return `${baseTag}\n${html}`
}

/** Detect content-type from file extension. */
function contentType(path: string): string {
  if (path.endsWith(".css")) return "text/css; charset=utf-8"
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8"
  if (path.endsWith(".json")) return "application/json; charset=utf-8"
  if (path.endsWith(".svg")) return "image/svg+xml"
  if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html; charset=utf-8"
  return "text/plain; charset=utf-8"
}

async function getProjectFiles(projectId: string): Promise<Record<string, string> | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { configJson: true },
    })
    if (!project) return null
    const config = project.configJson as ConfigJson | null
    return config?.files ?? (config?.htmlContent ? { "index.html": config.htmlContent } : {})
  } catch {
    return null
  }
}

/** GET /api/projects/[projectId]/preview → serves index.html */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const files = await getProjectFiles(projectId)

  if (!files) return new Response("Not found", { status: 404 })

  const html = files["index.html"] ?? EMPTY_PREVIEW

  // Base URL so all relative links resolve to our preview file server
  const origin = req.nextUrl.origin
  const base = `${origin}/api/projects/${projectId}/preview/`

  return new Response(injectBase(html, base), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache",
    },
  })
}
