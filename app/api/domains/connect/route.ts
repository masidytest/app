// Connect or disconnect a domain from a project deployment
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { addDomainToProject, removeDomainFromProject, domainsConfigured } from "@/lib/domains"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  if (!domainsConfigured) {
    return NextResponse.json({ error: "Domains not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { domain, projectId, action } = await req.json()

    if (!domain || !projectId) {
      return NextResponse.json({ error: "domain and projectId are required" }, { status: 400 })
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: { members: { some: { userId: session.sub } } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const vercelProjectId = process.env.VERCEL_PROJECT_ID ?? ""

    if (action === "disconnect") {
      await removeDomainFromProject(vercelProjectId, domain)
      return NextResponse.json({ success: true, action: "disconnected" })
    }

    const result = await addDomainToProject(vercelProjectId, domain)
    return NextResponse.json({ success: true, domain: result.name, configured: result.configured })
  } catch (error) {
    return NextResponse.json(
      { error: "Domain operation failed", details: String(error) },
      { status: 500 }
    )
  }
}
