// Plan definitions and usage limits
export type PlanId = "free" | "pro" | "enterprise"

export type PlanConfig = {
  id: PlanId
  label: string
  messagesPerMonth: number
  maxProjects: number
  price: number // USD per month, 0 = free
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    messagesPerMonth: 100,
    maxProjects: 1,
    price: 0,
  },
  pro: {
    id: "pro",
    label: "Pro",
    messagesPerMonth: 5000,
    maxProjects: 50,
    price: 29,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    messagesPerMonth: Infinity,
    maxProjects: Infinity,
    price: 99,
  },
}

export function getPlan(planId: string | null | undefined): PlanConfig {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS.free
}

// Credit packages for one-time purchase
export type CreditPackage = {
  id: string
  messages: number
  price: number // USD
  label: string
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits_100", messages: 100, price: 5, label: "100 messages" },
  { id: "credits_500", messages: 500, price: 20, label: "500 messages" },
  { id: "credits_1000", messages: 1000, price: 35, label: "1,000 messages" },
]
