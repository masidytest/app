// Sandbox instance operations — execute commands, write files, stop
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { runInSandbox, writeToSandbox, stopSandbox, getSandboxUrl } from "@/lib/sandbox"
import { z } from "zod"

// GET — get sandbox URL/status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sandboxId } = await params
  try {
    const url = await getSandboxUrl(sandboxId)
    return NextResponse.json({ sandboxId, url, status: url ? "running" : "stopped" })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get sandbox", details: String(error) },
      { status: 500 }
    )
  }
}

const executeSchema = z.object({
  action: z.enum(["execute", "write", "stop"]),
  cmd: z.string().optional(),
  args: z.array(z.string()).optional(),
  files: z.record(z.string()).optional(),
})

// POST — execute command, write files, or stop
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sandboxId } = await params

  try {
    const body = executeSchema.parse(await req.json())

    switch (body.action) {
      case "execute": {
        if (!body.cmd) {
          return NextResponse.json({ error: "cmd is required for execute" }, { status: 400 })
        }
        const result = await runInSandbox(sandboxId, body.cmd, body.args ?? [])
        return NextResponse.json(result)
      }

      case "write": {
        if (!body.files || Object.keys(body.files).length === 0) {
          return NextResponse.json({ error: "files required for write" }, { status: 400 })
        }
        await writeToSandbox(sandboxId, body.files)
        return NextResponse.json({ success: true })
      }

      case "stop": {
        await stopSandbox(sandboxId)
        return NextResponse.json({ success: true, status: "stopped" })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Sandbox operation failed", details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE — stop sandbox
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sandboxId } = await params
  try {
    await stopSandbox(sandboxId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to stop sandbox", details: String(error) },
      { status: 500 }
    )
  }
}
