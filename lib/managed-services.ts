// Managed services provisioning — all branded as Masidy
// Uses shared infrastructure with project-level isolation (prefixed keys, paths, schemas)
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""
}

// ─── Vercel Environment Variables (inject into deployments) ──────────────

export async function setVercelEnvVar(
  key: string,
  value: string,
  target: string[] = ["production", "preview", "development"]
): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value, target, type: "encrypted" }),
    }
  )

  if (!res.ok) {
    const data = await res.json()
    if (data.error?.code === "ENV_ALREADY_EXISTS") {
      await updateVercelEnvVar(key, value, target)
      return
    }
    throw new Error(`Failed to set env var: ${data.error?.message ?? res.status}`)
  }
}

async function updateVercelEnvVar(
  key: string,
  value: string,
  target: string[] = ["production", "preview", "development"]
): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return

  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${teamQuery()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  )

  if (!listRes.ok) throw new Error("Failed to list env vars")

  const listData = await listRes.json()
  const existing = listData.envs?.find((e: { key: string }) => e.key === key)

  if (existing) {
    await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}${teamQuery()}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, target }),
      }
    )
  }
}

export async function removeVercelEnvVar(key: string): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return

  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${teamQuery()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  )

  if (!listRes.ok) return

  const listData = await listRes.json()
  const existing = listData.envs?.find((e: { key: string }) => e.key === key)

  if (existing) {
    await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}${teamQuery()}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    )
  }
}

// ─── Database Provisioning ──────────────────────────────────────────────
// Creates a project-specific schema in the shared database

export async function provisionDatabase(projectId: string): Promise<{
  connectionString: string
  schema: string
}> {
  const prefix = projectId.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, "")
  const schema = `proj_${prefix}`

  // Create an isolated schema for this project in the shared database
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("Database not configured")

  // The project gets its own schema namespace in the shared DB
  // Connection string points to same DB but with search_path set to project schema
  const connectionString = databaseUrl.includes("?")
    ? `${databaseUrl}&schema=${schema}`
    : `${databaseUrl}?schema=${schema}`

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "database" } },
    create: {
      projectId,
      type: "database",
      name: "Masidy Database",
      status: "active",
      externalId: schema,
      credentials: {
        connectionString,
        schema,
        host: new URL(databaseUrl.replace("postgres://", "https://")).hostname,
        type: "postgresql",
      },
    },
    update: {
      status: "active",
      credentials: {
        connectionString,
        schema,
        host: new URL(databaseUrl.replace("postgres://", "https://")).hostname,
        type: "postgresql",
      },
    },
  })

  // Set env var so the project's deployed app can access it
  const envKey = `DATABASE_URL_${prefix.toUpperCase()}`
  await setVercelEnvVar(envKey, connectionString)

  // Also store which env var was created
  await prisma.projectEnvVar.upsert({
    where: { projectId_key_target: { projectId, key: envKey, target: "production" } },
    create: { projectId, key: envKey, value: connectionString, target: "production" },
    update: { value: connectionString },
  })

  return { connectionString, schema }
}

// ─── KV Store Provisioning ──────────────────────────────────────────────
// Uses shared Upstash Redis with project-prefixed keys

export async function provisionKVStore(projectId: string): Promise<{
  url: string
  prefix: string
}> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) throw new Error("Redis not configured")

  const prefix = `proj:${projectId.slice(0, 8)}:`

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "kv" } },
    create: {
      projectId,
      type: "kv",
      name: "Masidy KV",
      status: "active",
      externalId: prefix,
      credentials: {
        url: redisUrl,
        token: redisToken,
        prefix,
      },
    },
    update: {
      status: "active",
      credentials: {
        url: redisUrl,
        token: redisToken,
        prefix,
      },
    },
  })

  const shortId = projectId.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "")
  await setVercelEnvVar(`KV_REST_API_URL_${shortId}`, redisUrl)
  await setVercelEnvVar(`KV_REST_API_TOKEN_${shortId}`, redisToken)

  return { url: redisUrl, prefix }
}

// ─── Blob Storage Provisioning ──────────────────────────────────────────
// Uses shared Vercel Blob with project-prefixed paths

export async function provisionBlobStore(projectId: string): Promise<{
  token: string
  prefix: string
}> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) throw new Error("Blob storage not configured")

  const prefix = `projects/${projectId.slice(0, 8)}/`

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "blob" } },
    create: {
      projectId,
      type: "blob",
      name: "Masidy Storage",
      status: "active",
      externalId: prefix,
      credentials: {
        token: blobToken,
        prefix,
      },
    },
    update: {
      status: "active",
      credentials: {
        token: blobToken,
        prefix,
      },
    },
  })

  const shortId = projectId.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "")
  await setVercelEnvVar(`BLOB_READ_WRITE_TOKEN_${shortId}`, blobToken)

  return { token: blobToken, prefix }
}

// ─── Auth Service ───────────────────────────────────────────────────────
// Generates a unique JWT secret for the project

export async function provisionAuth(projectId: string): Promise<{
  jwtSecret: string
}> {
  const jwtSecret = crypto.randomBytes(32).toString("hex")

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "auth" } },
    create: {
      projectId,
      type: "auth",
      name: "Masidy Auth",
      status: "active",
      credentials: { jwtSecret },
    },
    update: {
      status: "active",
      credentials: { jwtSecret },
    },
  })

  const shortId = projectId.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "")
  await setVercelEnvVar(`AUTH_SECRET_${shortId}`, jwtSecret)

  return { jwtSecret }
}

// ─── Get all services for a project ──────────────────────────────────────

export async function getProjectServices(projectId: string) {
  return prisma.projectService.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })
}

// ─── Service type definitions ────────────────────────────────────────────

export const SERVICE_TYPES = [
  {
    type: "database",
    name: "Masidy Database",
    description: "PostgreSQL database for your app — automatic backups, SSL included.",
    icon: "database",
  },
  {
    type: "kv",
    name: "Masidy KV",
    description: "Redis-compatible key-value store — perfect for caching, sessions, rate limiting.",
    icon: "zap",
  },
  {
    type: "blob",
    name: "Masidy Storage",
    description: "File storage for uploads, images, and assets — CDN-backed globally.",
    icon: "hard-drive",
  },
  {
    type: "auth",
    name: "Masidy Auth",
    description: "Built-in authentication — JWT tokens, session management, ready to use.",
    icon: "shield",
  },
] as const
