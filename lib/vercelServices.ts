// Vercel and Upstash service integrations
import { Redis } from "@upstash/redis"
import { del as blobDel, getDownloadUrl, put as blobPut } from "@vercel/blob"
import { get as edgeConfigGet } from "@vercel/edge-config"

// KV (Redis via Upstash)
export const kv = Redis.fromEnv()

type BlobGetResult = { body: string } | null

const blobGet = async (pathname: string): Promise<BlobGetResult> => {
  try {
    const downloadUrl = await getDownloadUrl(pathname)
    const response = await fetch(downloadUrl)
    if (!response.ok) return null
    return { body: await response.text() }
  } catch {
    return null
  }
}

// Blob storage
export const blob = { put: blobPut, get: blobGet, del: blobDel }

// Edge Config
export const edgeConfig = { get: edgeConfigGet }

// Vector: No official Vercel SDK, add integration here if available
export const vector = {};
