// Poll Vercel deployment build status
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDeploymentStatus } from "@/lib/vercel-deploy"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    })
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // If it has a Vercel deploy ID in commit field and is still building, poll Vercel
    if (deployment.status === "building" && deployment.commit && process.env.VERCEL_TOKEN) {
      try {
        const status = await getDeploymentStatus(deployment.commit)
        const newStatus = status.readyState === "READY" ? "live" : status.readyState === "ERROR" ? "failed" : "building"

        if (newStatus !== deployment.status) {
          await prisma.deployment.update({
            where: { id: deploymentId },
            data: {
              status: newStatus,
              url: status.url ?? deployment.url,
            },
          })
        }

        return NextResponse.json({
          id: deployment.id,
          status: newStatus,
          url: status.url ?? deployment.url,
          readyState: status.readyState,
        })
      } catch {
        // If Vercel API fails, return current DB state
      }
    }

    return NextResponse.json({
      id: deployment.id,
      status: deployment.status,
      url: deployment.url,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status", details: String(error) },
      { status: 500 }
    )
  }
}
