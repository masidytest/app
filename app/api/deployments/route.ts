// Deployment lifecycle API handler
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { deployToVercel } from "@/lib/vercel-deploy"

const deploymentSchema = z.object({
  projectId: z.string().min(1),
  versionId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  status: z.string().optional(),
  url: z.string().optional(),
  baseUrl: z.string().optional(),
  commit: z.string().optional(),
  target: z.enum(["preview", "vercel"]).optional().default("preview"),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

type ConfigJson = { files?: Record<string, string> }

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId")
    const deployments = await prisma.deployment.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ deployments })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch deployments", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = deploymentSchema.parse(await req.json())
    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
      select: { id: true, name: true, configJson: true, status: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Create version snapshot
    let versionId = payload.versionId
    if (!versionId) {
      const latest = await prisma.version.findFirst({
        where: { projectId: payload.projectId },
        orderBy: { number: "desc" },
      })
      const version = await prisma.version.create({
        data: {
          projectId: payload.projectId,
          number: (latest?.number ?? 0) + 1,
          snapshot: project.configJson ?? undefined,
        },
      })
      versionId = version.id
    }

    let slug = payload.slug ?? slugify(project.name || "deployment")
    if (!slug) slug = `deployment-${Date.now().toString().slice(-6)}`
    const existing = await prisma.deployment.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString().slice(-6)}`

    // Determine deploy URL — try Vercel first if requested, fall back to built-in preview
    let deployUrl: string
    let vercelDeployId: string | null = null
    let status = payload.status ?? "live"

    const config = project.configJson as ConfigJson | null
    const files = config?.files ?? {}

    if (payload.target === "vercel" && process.env.VERCEL_TOKEN) {
      try {
        const result = await deployToVercel(files, project.name || "masidy-app")
        deployUrl = result.url
        vercelDeployId = result.id
        status = result.readyState === "READY" ? "live" : "building"
      } catch (err) {
        // Fall back to built-in preview if Vercel deploy fails
        console.error("Vercel deploy failed, using preview:", err)
        const origin = req.nextUrl.origin
        deployUrl = `${origin}/api/preview/${slug}`
      }
    } else if (payload.baseUrl) {
      deployUrl = `${payload.baseUrl}/api/preview/${slug}`
    } else {
      deployUrl = payload.url ?? `${req.nextUrl.origin}/api/preview/${slug}`
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId: payload.projectId,
        versionId,
        slug,
        status,
        commit: vercelDeployId ?? payload.commit ?? null,
        url: deployUrl,
      },
    })

    await prisma.project.update({
      where: { id: payload.projectId },
      data: { status: "live" },
    })

    return NextResponse.json({ deployment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create deployment", details: String(error) },
      { status: 500 }
    )
  }
}
