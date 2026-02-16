// Catch-all preview file server.
// Serves any file from a project's virtual filesystem.
// e.g. GET /api/projects/123/preview/css/styles.css
//       GET /api/projects/123/preview/pages/about.html
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type ConfigJson = {
  files?: Record<string, string>
  htmlContent?: string
}

function contentType(path: string): string {
  if (path.endsWith(".css")) return "text/css; charset=utf-8"
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8"
  if (path.endsWith(".json")) return "application/json; charset=utf-8"
  if (path.endsWith(".svg")) return "image/svg+xml"
  if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html; charset=utf-8"
  return "text/plain; charset=utf-8"
}

/** Inject a <base> tag into HTML so relative links continue to resolve. */
function injectBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`)
  }
  return `${baseTag}\n${html}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; path: string[] }> }
) {
  const { projectId, path: pathSegments } = await params
  const filePath = pathSegments.join("/")

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { configJson: true },
    })

    if (!project) return new Response("Not found", { status: 404 })

    const config = project.configJson as ConfigJson | null
    const files: Record<string, string> =
      config?.files ?? (config?.htmlContent ? { "index.html": config.htmlContent } : {})

    // Exact match first
    let content = files[filePath]

    // For HTML files without extension, try appending .html
    if (content === undefined && !filePath.includes(".")) {
      content = files[`${filePath}.html`] ?? files[`${filePath}/index.html`]
    }

    // Directory index fallback
    if (content === undefined && !filePath.endsWith(".html")) {
      content = files[`${filePath}/index.html`]
    }

    if (content === undefined) {
      return new Response(`File not found: ${filePath}`, { status: 404 })
    }

    const ct = contentType(filePath)
    let body = content

    // For HTML files, inject the base tag so relative links keep working
    if (ct.startsWith("text/html")) {
      const origin = req.nextUrl.origin
      // Base is always the root of the preview server for this project
      const base = `${origin}/api/projects/${projectId}/preview/`
      body = injectBase(content, base)
    }

    return new Response(body, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "no-store, no-cache",
      },
    })
  } catch {
    return new Response("Error loading file", { status: 500 })
  }
}
