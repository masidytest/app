// Run project config execution endpoint
import { NextRequest, NextResponse } from "next/server"
import { readConfig, executeFlow } from "@/lib/engine"

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const input = await req.json().catch(() => null)
    const config = await readConfig(params.projectId)

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    const result = await executeFlow(config, input)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute flow", details: String(error) },
      { status: 500 }
    )
  }
}
