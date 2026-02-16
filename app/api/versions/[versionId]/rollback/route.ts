// Rollback a project to a specific version's snapshot
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params
  try {
    const version = await prisma.version.findUnique({
      where: { id: versionId },
    })
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }
    if (!version.snapshot) {
      return NextResponse.json({ error: "Version has no snapshot" }, { status: 400 })
    }

    // Restore the snapshot to the project's configJson
    await prisma.project.update({
      where: { id: version.projectId },
      data: { configJson: version.snapshot as object },
    })

    return NextResponse.json({ success: true, restoredVersion: version.number })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to rollback", details: String(error) },
      { status: 500 }
    )
  }
}
