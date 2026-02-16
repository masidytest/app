// Manage environment variables for project deployments
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { setVercelEnvVar, removeVercelEnvVar } from "@/lib/managed-services"

export async function GET(
  _req: NextRequest,
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

  const envVars = await prisma.projectEnvVar.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  // Mask values for security
  const masked = envVars.map((v) => ({
    id: v.id,
    key: v.key,
    value: v.value.slice(0, 4) + "•".repeat(Math.max(0, v.value.length - 4)),
    target: v.target,
    createdAt: v.createdAt,
  }))

  return NextResponse.json({ envVars: masked })
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
    const { key, value, target } = await req.json()

    if (!key || !value) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 })
    }

    // Validate key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "Key must be uppercase with underscores (e.g. MY_API_KEY)" },
        { status: 400 }
      )
    }

    // Save to our DB
    await prisma.projectEnvVar.upsert({
      where: { projectId_key_target: { projectId, key, target: target ?? "production" } },
      create: { projectId, key, value, target: target ?? "production" },
      update: { value },
    })

    // Sync to Vercel so deployments get it
    await setVercelEnvVar(key, value)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to set env var", details: String(error) },
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

  const { key } = await req.json()

  await prisma.projectEnvVar.deleteMany({
    where: { projectId, key },
  })

  // Remove from Vercel too
  await removeVercelEnvVar(key)

  return NextResponse.json({ success: true })
}
