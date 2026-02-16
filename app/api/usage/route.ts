// Usage tracking endpoint
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const usageSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  amount: z.number().int().nonnegative().default(1),
})

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    const from = req.nextUrl.searchParams.get("from")
    const to = req.nextUrl.searchParams.get("to")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: "Invalid from date" }, { status: 400 })
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 })
    }

    const events = await prisma.usageEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const total = events.reduce((sum, event) => sum + event.amount, 0)

    return NextResponse.json({ total, events })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch usage", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = usageSchema.parse(await req.json())
    const usageEvent = await prisma.usageEvent.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        amount: payload.amount,
      },
    })
    return NextResponse.json({ tracked: true, usageEvent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to track usage event", details: String(error) },
      { status: 500 }
    )
  }
}
