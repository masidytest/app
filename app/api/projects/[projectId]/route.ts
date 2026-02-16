// GET and PATCH for a single project
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, status: true, configJson: true },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const body = await req.json()

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { configJson: true },
    })

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.configJson !== undefined
          ? {
              configJson: {
                ...((existing?.configJson as object) ?? {}),
                ...body.configJson,
              },
            }
          : {}),
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update project", details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    // Delete in dependency order
    await prisma.deployment.deleteMany({ where: { projectId } })
    await prisma.projectMessage.deleteMany({ where: { projectId } })
    await prisma.version.deleteMany({ where: { projectId } })
    await prisma.project.delete({ where: { id: projectId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete project", details: String(error) },
      { status: 500 }
    )
  }
}
