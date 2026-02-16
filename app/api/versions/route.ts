// Version lifecycle API handler
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const versionSchema = z.object({
  projectId: z.string().min(1),
  number: z.number().int().positive().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId")
    const versions = await prisma.version.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ versions })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch versions", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = versionSchema.parse(await req.json())
    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    const latest = await prisma.version.findFirst({
      where: { projectId: payload.projectId },
      orderBy: { number: "desc" },
    })
    const version = await prisma.version.create({
      data: {
        projectId: payload.projectId,
        number: payload.number ?? (latest?.number ?? 0) + 1,
      },
    })
    return NextResponse.json({ version })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create version", details: String(error) },
      { status: 500 }
    )
  }
}
