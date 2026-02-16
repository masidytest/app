// Public deployment preview — serve index.html by deployment slug
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type ConfigJson = {
  files?: Record<string, string>
  htmlContent?: string
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Not Found — Nova</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-950 flex items-center justify-center">
  <div class="text-center px-6">
    <p class="text-gray-400 text-lg font-medium mb-2">Deployment not found</p>
    <p class="text-gray-600 text-sm">This deployment may have been removed or the link is incorrect.</p>
  </div>
</body>
</html>`

/** Inject a <base> tag so relative links resolve via the deployment preview API. */
function injectBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl}">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`)
  }
  return `${baseTag}\n${html}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { slug },
      include: {
        project: { select: { configJson: true } },
      },
    })

    if (!deployment) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    const config = deployment.project.configJson as ConfigJson | null
    const files: Record<string, string> =
      config?.files ?? (config?.htmlContent ? { "index.html": config.htmlContent } : {})

    const html = files["index.html"]
    if (!html) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    // Inject base tag so CSS/JS/page links resolve through the catch-all route
    const origin = req.nextUrl.origin
    const base = `${origin}/api/preview/${slug}/`

    return new Response(injectBase(html, base), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    })
  } catch {
    return new Response("Error loading deployment", { status: 500 })
  }
}
