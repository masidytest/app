// Manage project services — list, provision, deprovision
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getProjectServices,
  provisionDatabase,
  provisionKVStore,
  provisionBlobStore,
  provisionAuth,
} from "@/lib/managed-services"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user owns this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: session.sub } } },
    },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const services = await getProjectServices(projectId)

  // Strip sensitive credentials from response
  const safe = services.map((s) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    status: s.status,
    createdAt: s.createdAt,
  }))

  return NextResponse.json({ services: safe })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: session.sub } } },
    },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const { type } = await req.json()

    // Check if already provisioned
    const existing = await prisma.projectService.findUnique({
      where: { projectId_type: { projectId, type } },
    })
    if (existing?.status === "active") {
      return NextResponse.json({ error: "Service already active" }, { status: 400 })
    }

    let result: Record<string, string> = {}

    switch (type) {
      case "database":
        result = await provisionDatabase(projectId)
        break
      case "kv":
        result = await provisionKVStore(projectId)
        break
      case "blob":
        result = await provisionBlobStore(projectId)
        break
      case "auth":
        result = await provisionAuth(projectId)
        break
      default:
        return NextResponse.json({ error: "Unknown service type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, type, status: "active" })
  } catch (error) {
    return NextResponse.json(
      { error: "Service provisioning failed", details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: session.sub } } },
    },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { type } = await req.json()

  await prisma.projectService.deleteMany({
    where: { projectId, type },
  })

  return NextResponse.json({ success: true })
}
