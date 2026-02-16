// Sliding window rate limiter using Upstash Redis
import { kv } from "@/lib/vercelServices"

type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
}

/**
 * Sliding window rate limit.
 * @param key   unique identifier (e.g. userId or IP)
 * @param limit max requests per window
 * @param windowSeconds window size in seconds (default 60)
 */
export async function rateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const redisKey = `rl:${key}`

  try {
    // Use a pipeline: remove old entries, add current, count, set expiry
    const pipe = kv.pipeline()
    pipe.zremrangebyscore(redisKey, 0, now - windowMs)
    pipe.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` })
    pipe.zcard(redisKey)
    pipe.expire(redisKey, windowSeconds + 1)

    const results = await pipe.exec()
    const count = (results[2] as number) ?? 0

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt: now + windowMs,
    }
  } catch {
    // If Redis is unavailable, allow the request (fail-open)
    return { allowed: true, remaining: limit, limit, resetAt: now + windowMs }
  }
}
