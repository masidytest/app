// Workspace lifecycle API handler
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { z } from "zod"

const workspaceSchema = z.object({
  name: z.string().min(1),
  plan: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId: session.sub } } },
      include: {
        _count: {
          select: { members: true, projects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        membersCount: workspace._count.members,
        projectsCount: workspace._count.projects,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch workspaces", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const payload = workspaceSchema.parse(await req.json())
    const workspace = await prisma.workspace.create({
      data: {
        name: payload.name,
        plan: payload.plan ?? "free",
        members: {
          create: { userId: session.sub, role: "owner" },
        },
      },
    })
    return NextResponse.json({ workspace })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create workspace", details: String(error) },
      { status: 500 }
    )
  }
}
