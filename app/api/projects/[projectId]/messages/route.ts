import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  try {
    const messages = await prisma.projectMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  try {
    const payload = messageSchema.parse(await req.json())
    const project = await prisma.project.findUnique({ where: { id: projectId } })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const message = await prisma.projectMessage.create({
      data: {
        projectId,
        role: payload.role,
        content: payload.content,
      },
    })
    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create message", details: String(error) },
      { status: 500 }
    )
  }
}
