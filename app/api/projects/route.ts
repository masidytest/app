// Project lifecycle API handler
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const projectSchema = z.object({
  name: z.string().min(1),
  workspaceId: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  configJson: z.unknown().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspaceId")
    const projects = await prisma.project.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = projectSchema.parse(await req.json())
    const workspace = await prisma.workspace.findUnique({
      where: { id: payload.workspaceId },
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }
    const project = await prisma.project.create({
      data: {
        name: payload.name,
        workspaceId: payload.workspaceId,
        description: payload.description ?? null,
        status: payload.status ?? "draft",
        configJson: payload.configJson ?? {},
      },
    })
    return NextResponse.json({ project })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create project", details: String(error) },
      { status: 500 }
    )
  }
}
