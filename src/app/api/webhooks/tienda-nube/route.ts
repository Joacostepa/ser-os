import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyWebhookSignature } from "@/lib/tienda-nube/hmac"
import { createTNClientByStoreId } from "@/lib/tienda-nube/factory"
import { handleWebhookEvent } from "@/lib/tienda-nube/handlers"
import type { TNWebhookPayload } from "@/lib/tienda-nube/types"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = getAdminClient()

  try {
    const rawBody = await request.text()
    const body: TNWebhookPayload = JSON.parse(rawBody)

    const { store_id, event, id: resourceId } = body

    if (!store_id || !event || !resourceId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const storeIdStr = String(store_id)

    // Find the tienda by TN store_id
    const { data: tienda } = await supabase
      .from("tiendas")
      .select("id, webhook_secret")
      .eq("tienda_nube_store_id", storeIdStr)
      .eq("activa", true)
      .single()

    if (!tienda) {
      console.error(`No active tienda for store_id: ${storeIdStr}`)
      return NextResponse.json({ error: "Unknown store" }, { status: 404 })
    }

    // Validate HMAC signature if webhook_secret is configured
    if (tienda.webhook_secret) {
      const signature = request.headers.get("x-linkedstore-hmac-sha256") || ""
      const valid = await verifyWebhookSignature(rawBody, signature, tienda.webhook_secret)
      if (!valid) {
        console.error(`Invalid webhook signature for store ${storeIdStr}`)
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Idempotency check — don't process duplicates
    const resourceIdStr = String(resourceId)
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("tienda_id", tienda.id)
      .eq("event", event)
      .eq("tn_resource_id", resourceIdStr)
      .eq("status", "completed")
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, message: "Already processed" })
    }

    // Insert webhook event as pending
    const { data: webhookEvent } = await supabase
      .from("webhook_events")
      .insert({
        tienda_id: tienda.id,
        event,
        tn_resource_id: resourceIdStr,
        tn_store_id: storeIdStr,
        status: "pending",
        payload: body,
      })
      .select("id")
      .single()

    // Respond 200 immediately (TN has 3-second timeout)
    // Process async using Next.js after()
    after(async () => {
      try {
        const { client, tienda: tiendaData } = await createTNClientByStoreId(storeIdStr)

        await handleWebhookEvent({
          event,
          resourceId: resourceIdStr,
          tienda: tiendaData,
          client,
          supabase,
        })

        // Mark as completed
        if (webhookEvent) {
          await supabase
            .from("webhook_events")
            .update({ status: "completed", processed_at: new Date().toISOString() })
            .eq("id", webhookEvent.id)
        }
      } catch (err) {
        console.error(`Webhook processing error [${event}]:`, err)
        if (webhookEvent) {
          await supabase
            .from("webhook_events")
            .update({
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
              processed_at: new Date().toISOString(),
            })
            .eq("id", webhookEvent.id)
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
