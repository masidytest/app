// Managed services provisioning — all branded as Masidy, powered by Vercel/Neon/Upstash behind the scenes
import { prisma } from "@/lib/prisma"

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

  // Try to create, if exists update
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
    // If already exists, update it
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

  // Get the env var ID first
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

// ─── Database Provisioning (Neon Postgres via Vercel Integration) ────────

export async function provisionDatabase(projectId: string): Promise<{
  connectionString: string
  host: string
  database: string
}> {
  // Create a Vercel Postgres (Neon) store via Vercel Storage API
  if (!VERCEL_TOKEN) throw new Error("Not configured")

  const storeName = `masidy-db-${projectId.slice(0, 8)}`

  const res = await fetch(
    `https://api.vercel.com/v1/storage/stores${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: storeName,
        type: "postgres",
        projectId: VERCEL_PROJECT_ID,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Database provisioning failed: ${err}`)
  }

  const data = await res.json()

  // Extract connection string from the store
  const connectionString = data.connectionString ?? data.url ?? ""
  const host = data.host ?? ""
  const database = data.database ?? storeName

  // Store credentials in our DB
  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "database" } },
    create: {
      projectId,
      type: "database",
      name: "Masidy Database",
      status: "active",
      externalId: data.id ?? storeName,
      credentials: {
        connectionString,
        host,
        database,
      },
    },
    update: {
      status: "active",
      externalId: data.id ?? storeName,
      credentials: {
        connectionString,
        host,
        database,
      },
    },
  })

  // Auto-set env var for the project's deployments
  if (connectionString) {
    await setVercelEnvVar(`DATABASE_URL_${projectId.slice(0, 8).toUpperCase()}`, connectionString)
  }

  return { connectionString, host, database }
}

// ─── KV Store Provisioning (Upstash Redis via Vercel Integration) ────────

export async function provisionKVStore(projectId: string): Promise<{
  url: string
  token: string
}> {
  if (!VERCEL_TOKEN) throw new Error("Not configured")

  const storeName = `masidy-kv-${projectId.slice(0, 8)}`

  const res = await fetch(
    `https://api.vercel.com/v1/storage/stores${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: storeName,
        type: "kv",
        projectId: VERCEL_PROJECT_ID,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`KV provisioning failed: ${err}`)
  }

  const data = await res.json()
  const url = data.restApiUrl ?? data.url ?? ""
  const token = data.restApiToken ?? data.token ?? ""

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "kv" } },
    create: {
      projectId,
      type: "kv",
      name: "Masidy KV Store",
      status: "active",
      externalId: data.id ?? storeName,
      credentials: { url, token },
    },
    update: {
      status: "active",
      externalId: data.id ?? storeName,
      credentials: { url, token },
    },
  })

  return { url, token }
}

// ─── Blob Storage Provisioning ───────────────────────────────────────────

export async function provisionBlobStore(projectId: string): Promise<{
  token: string
}> {
  if (!VERCEL_TOKEN) throw new Error("Not configured")

  const storeName = `masidy-blob-${projectId.slice(0, 8)}`

  const res = await fetch(
    `https://api.vercel.com/v1/storage/stores${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: storeName,
        type: "blob",
        projectId: VERCEL_PROJECT_ID,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Blob provisioning failed: ${err}`)
  }

  const data = await res.json()
  const token = data.clientToken ?? data.token ?? ""

  await prisma.projectService.upsert({
    where: { projectId_type: { projectId, type: "blob" } },
    create: {
      projectId,
      type: "blob",
      name: "Masidy Storage",
      status: "active",
      externalId: data.id ?? storeName,
      credentials: { token },
    },
    update: {
      status: "active",
      externalId: data.id ?? storeName,
      credentials: { token },
    },
  })

  return { token }
}

// ─── Auth Service (generates auth config for project) ────────────────────

export async function provisionAuth(projectId: string): Promise<{
  jwtSecret: string
}> {
  // Generate a unique JWT secret for this project's auth
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const jwtSecret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")

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

  // Set the secret as an env var for deployments
  await setVercelEnvVar(`AUTH_SECRET_${projectId.slice(0, 8).toUpperCase()}`, jwtSecret)

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
