import { NextRequest, NextResponse } from "next/server"
import { createTNClientForTienda } from "@/lib/tienda-nube/factory"

const WEBHOOK_EVENTS = [
  "order/created",
  "order/updated",
  "order/paid",
  "order/packed",
  "order/fulfilled",
  "order/cancelled",
  "product/created",
  "product/updated",
  "product/deleted",
]

export async function POST(request: NextRequest) {
  try {
    const { tienda_id, webhook_url } = await request.json()

    if (!tienda_id || !webhook_url) {
      return NextResponse.json(
        { error: "tienda_id y webhook_url son requeridos" },
        { status: 400 }
      )
    }

    const { client } = await createTNClientForTienda(tienda_id)

    // List existing webhooks to avoid duplicates
    const existingResult = await client.listWebhooks()
    const existingEvents = new Set(
      existingResult.ok ? existingResult.data.map((w) => w.event) : []
    )

    const results: Array<{ event: string; ok: boolean; error?: string }> = []

    for (const event of WEBHOOK_EVENTS) {
      if (existingEvents.has(event)) {
        results.push({ event, ok: true })
        continue
      }

      const result = await client.createWebhook(event, webhook_url)
      results.push({
        event,
        ok: result.ok,
        error: !result.ok ? result.error : undefined,
      })
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
