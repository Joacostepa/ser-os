import type { SupabaseClient } from "@supabase/supabase-js"
import type { TiendaNubeClient } from "../client"
import type { TiendaRecord } from "../factory"
import { handleOrderCreated } from "./order-created"
import { handleOrderUpdated } from "./order-updated"
import { handleOrderPaid } from "./order-paid"
import { handleOrderPacked } from "./order-packed"
import { handleOrderFulfilled } from "./order-fulfilled"
import { handleOrderCancelled } from "./order-cancelled"
import { handleProductCreated } from "./product-created"
import { handleProductUpdated } from "./product-updated"
import { handleProductDeleted } from "./product-deleted"

export interface WebhookContext {
  event: string
  resourceId: string
  tienda: TiendaRecord
  client: TiendaNubeClient
  supabase: SupabaseClient
}

const handlers: Record<string, (ctx: WebhookContext) => Promise<void>> = {
  "order/created": handleOrderCreated,
  "order/updated": handleOrderUpdated,
  "order/paid": handleOrderPaid,
  "order/packed": handleOrderPacked,
  "order/fulfilled": handleOrderFulfilled,
  "order/cancelled": handleOrderCancelled,
  "product/created": handleProductCreated,
  "product/updated": handleProductUpdated,
  "product/deleted": handleProductDeleted,
}

export async function handleWebhookEvent(ctx: WebhookContext): Promise<void> {
  const handler = handlers[ctx.event]

  if (!handler) {
    console.log(`No handler for event: ${ctx.event}`)
    return
  }

  await handler(ctx)
}
