// Shared engine module for VS Agent logic
// Handles config_json reading, execution, and orchestration


import { prisma } from "@/lib/prisma"
import { blob } from "@/lib/vercelServices"

// Try to load config_json from DB, fallback to Blob if needed
export async function readConfig(projectId: string) {
  // Try DB first
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (project?.configJson) return project.configJson
  // Optionally, try loading from Blob storage if not in DB
  try {
    const blobResult = await blob.get(`config_json/${projectId}.json`)
    if (blobResult) return JSON.parse(blobResult.body)
  } catch (e) {}
  return null
}

// Stub for flow execution logic
export async function executeFlow(config: unknown, input: unknown) {
  if (!config) {
    throw new Error("Config not found")
  }

  const startedAt = Date.now()
  let usageRecorded = false

  if (input && typeof input === "object" && "userId" in input) {
    const { userId, type, amount } = input as {
      userId?: string
      type?: string
      amount?: number
    }

    if (userId && type) {
      await prisma.usageEvent.create({
        data: {
          userId,
          type,
          amount: typeof amount === "number" ? amount : 1,
        },
      })
      usageRecorded = true
    }
  }

  return {
    ok: true,
    usageRecorded,
    receivedAt: new Date(startedAt).toISOString(),
    elapsedMs: Date.now() - startedAt,
    configSummary: {
      type: Array.isArray(config) ? "array" : typeof config,
    },
    output: input ?? null,
  }
}
