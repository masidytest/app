// Usage enforcement — check if user is within plan limits + purchased credits
import { prisma } from "@/lib/prisma"
import { getPlan } from "@/lib/plans"

export type UsageCheck = {
  allowed: boolean
  used: number
  limit: number
  credits: number
  plan: string
}

export async function checkUsageLimit(userId: string): Promise<UsageCheck> {
  // Get active subscription to determine plan
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  })

  const plan = getPlan(subscription?.plan)

  // Count AI messages this calendar month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [used, creditsPurchased] = await Promise.all([
    prisma.usageEvent.count({
      where: {
        userId,
        type: "ai_message",
        createdAt: { gte: monthStart },
      },
    }),
    // Sum all credit purchases this month
    prisma.usageEvent.aggregate({
      where: {
        userId,
        type: "credit_purchase",
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ])

  const extraCredits = creditsPurchased._sum.amount ?? 0
  const totalLimit = plan.messagesPerMonth + extraCredits

  return {
    allowed: plan.messagesPerMonth === Infinity || used < totalLimit,
    used,
    limit: totalLimit,
    credits: extraCredits,
    plan: plan.id,
  }
}

export async function recordUsage(userId: string, type: string = "ai_message") {
  await prisma.usageEvent.create({
    data: { userId, type, amount: 1 },
  })
}
