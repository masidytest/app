// Get a single version with its snapshot
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
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
    return NextResponse.json({ version })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch version", details: String(error) },
      { status: 500 }
    )
  }
}
