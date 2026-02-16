// Catch-all route for deployment sub-files (CSS, JS, pages, etc.)
// e.g. GET /api/preview/my-app/css/styles.css
//      GET /api/preview/my-app/pages/about.html
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

/** Inject a <base> tag into HTML so relative links resolve via the deployment preview. */
function injectBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`)
  }
  return `${baseTag}\n${html}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: pathSegments } = await params
  const filePath = pathSegments.join("/")

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { slug },
      include: {
        project: { select: { configJson: true } },
      },
    })

    if (!deployment) return new Response("Not found", { status: 404 })

    const config = deployment.project.configJson as ConfigJson | null
    const files: Record<string, string> =
      config?.files ?? (config?.htmlContent ? { "index.html": config.htmlContent } : {})

    // Exact match first
    let content = files[filePath]

    // For paths without extension, try appending .html
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

    // For HTML files, inject base tag so relative links keep working
    if (ct.startsWith("text/html")) {
      const origin = req.nextUrl.origin
      const base = `${origin}/api/preview/${slug}/`
      body = injectBase(content, base)
    }

    return new Response(body, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    })
  } catch {
    return new Response("Error loading file", { status: 500 })
  }
}
