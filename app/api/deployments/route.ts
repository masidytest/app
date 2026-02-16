// Deployment lifecycle API handler
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const deploymentSchema = z.object({
  projectId: z.string().min(1),
  versionId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  status: z.string().optional(),
  url: z.string().optional(),
  baseUrl: z.string().optional(), // e.g. "http://localhost:3000" — builds url as {baseUrl}/api/preview/{slug}
  commit: z.string().optional(),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

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
    const project = await prisma.project.findUnique({ where: { id: payload.projectId } })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

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
        },
      })
      versionId = version.id
    }

    let slug = payload.slug ?? slugify(project.name || "deployment")
    if (!slug) {
      slug = `deployment-${Date.now().toString().slice(-6)}`
    }
    const existing = await prisma.deployment.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`
    }

    const deployUrl = payload.baseUrl
      ? `${payload.baseUrl}/api/preview/${slug}`
      : (payload.url ?? `https://${slug}.novabuilder.app`)

    const deployment = await prisma.deployment.create({
      data: {
        projectId: payload.projectId,
        versionId,
        slug,
        status: payload.status ?? "live",
        commit: payload.commit ?? null,
        url: deployUrl,
      },
    })

    // Mark project as live
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
