// Create a new sandbox for a project
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { createProjectSandbox } from "@/lib/sandbox"
import { z } from "zod"

const createSchema = z.object({
  projectId: z.string().min(1),
  runtime: z.enum(["node24", "node22", "python3.13"]).optional(),
  port: z.number().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = createSchema.parse(await req.json())

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true, name: true, configJson: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    type ConfigJson = { files?: Record<string, string> }
    const config = project.configJson as ConfigJson | null
    const files = config?.files ?? {}

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No files to run" }, { status: 400 })
    }

    const result = await createProjectSandbox(files, {
      runtime: body.runtime,
      port: body.port,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create sandbox", details: String(error) },
      { status: 500 }
    )
  }
}
