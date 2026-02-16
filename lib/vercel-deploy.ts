// Deploy static files to Vercel using the REST API
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

type DeployResult = {
  id: string
  url: string
  readyState: string
}

export async function deployToVercel(
  files: Record<string, string>,
  projectName: string
): Promise<DeployResult> {
  if (!VERCEL_TOKEN) {
    throw new Error("VERCEL_TOKEN is not configured")
  }

  // Build the files array for Vercel API
  const vercelFiles = Object.entries(files).map(([filePath, content]) => ({
    file: filePath,
    data: content,
  }))

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""

  const res = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 52),
      files: vercelFiles,
      projectSettings: {
        framework: null, // static deployment
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vercel API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    id: data.id,
    url: rewriteUrl(data.url),
    readyState: data.readyState ?? "QUEUED",
  }
}

/** Rewrite deployment URL to hide Vercel branding */
function rewriteUrl(url: string): string {
  // Use our preview route instead of exposing *.vercel.app
  const slug = url?.replace(/\.vercel\.app$/, "") ?? url
  const projectUrl = process.env.PROJECT_URL ?? "https://masidy.app"
  return `${projectUrl}/api/preview/${slug}`
}

export async function getDeploymentStatus(deploymentId: string): Promise<{
  readyState: string
  url: string | null
}> {
  if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN is not configured")

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${deploymentId}${teamQuery}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  )

  if (!res.ok) {
    throw new Error(`Vercel API error ${res.status}`)
  }

  const data = await res.json()
  return {
    readyState: data.readyState ?? "UNKNOWN",
    url: data.url ? rewriteUrl(data.url) : null,
  }
}
