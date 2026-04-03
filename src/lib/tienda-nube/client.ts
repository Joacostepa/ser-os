import { getRateLimiter } from "./rate-limiter"
import type { TNResult, TNOrder, TNProduct, TNVariant, TNCustomer, TNFulfillmentOrder, TNWebhook, TNStore } from "./types"

const API_VERSION = "2025-03"
const USER_AGENT = "SERMayorista (contacto@sermayorista.com)"

export class TiendaNubeClient {
  private baseUrl: string

  constructor(
    private storeId: string,
    private accessToken: string
  ) {
    this.baseUrl = `https://api.tiendanube.com/${API_VERSION}/${storeId}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retries = 3
  ): Promise<TNResult<T>> {
    const limiter = getRateLimiter(this.storeId)
    await limiter.acquire()

    const url = `${this.baseUrl}${path}`

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers: {
            Authentication: `bearer ${this.accessToken}`,
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": USER_AGENT,
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        if (res.status === 429) {
          // Rate limited — wait and retry
          const resetMs = parseInt(res.headers.get("x-rate-limit-reset") || "1000")
          await new Promise((r) => setTimeout(r, resetMs))
          continue
        }

        if (res.status >= 500 && attempt < retries) {
          // Server error — exponential backoff
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
          continue
        }

        if (!res.ok) {
          const errorText = await res.text()
          return { ok: false, error: errorText, status: res.status }
        }

        // Some endpoints return empty body (204, etc.)
        if (res.status === 204) {
          return { ok: true, data: undefined as T }
        }

        const data = await res.json()
        return { ok: true, data }
      } catch (err) {
        if (attempt === retries) {
          return { ok: false, error: err instanceof Error ? err.message : "Network error" }
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
    }

    return { ok: false, error: "Max retries exceeded" }
  }

  async *paginatedGet<T>(path: string, params?: Record<string, string>): AsyncGenerator<T[]> {
    let page = 1
    const perPage = 200

    while (true) {
      const searchParams = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        ...params,
      })

      const result = await this.request<T[]>("GET", `${path}?${searchParams}`)

      if (!result.ok) break

      if (result.data.length === 0) break

      yield result.data

      if (result.data.length < perPage) break

      page++
    }
  }

  // ==================== ORDERS ====================

  async getOrder(orderId: string | number): Promise<TNResult<TNOrder>> {
    return this.request<TNOrder>("GET", `/orders/${orderId}`)
  }

  async *getOrders(filters?: Record<string, string>): AsyncGenerator<TNOrder[]> {
    yield* this.paginatedGet<TNOrder>("/orders", filters)
  }

  async cancelOrder(orderId: string | number): Promise<TNResult<void>> {
    return this.request<void>("POST", `/orders/${orderId}/cancel`)
  }

  // ==================== FULFILLMENT ====================

  async getFulfillmentOrders(orderId: string | number): Promise<TNResult<TNFulfillmentOrder[]>> {
    return this.request<TNFulfillmentOrder[]>("GET", `/orders/${orderId}/fulfillment-orders`)
  }

  async updateFulfillmentStatus(
    orderId: string | number,
    fulfillmentId: string | number,
    status: "PACKED" | "SHIPPED" | "DELIVERED"
  ): Promise<TNResult<TNFulfillmentOrder>> {
    return this.request<TNFulfillmentOrder>(
      "PATCH",
      `/orders/${orderId}/fulfillment-orders/${fulfillmentId}`,
      { status }
    )
  }

  async createTrackingEvent(
    orderId: string | number,
    fulfillmentId: string | number,
    event: {
      status: "shipped" | "delivered"
      happened_at: string
      description?: string
      tracking_number?: string
      tracking_url?: string
    }
  ): Promise<TNResult<unknown>> {
    return this.request(
      "POST",
      `/orders/${orderId}/fulfillment-orders/${fulfillmentId}/tracking-events`,
      event
    )
  }

  // ==================== PRODUCTS ====================

  async getProduct(productId: string | number): Promise<TNResult<TNProduct>> {
    return this.request<TNProduct>("GET", `/products/${productId}`)
  }

  async *getProducts(filters?: Record<string, string>): AsyncGenerator<TNProduct[]> {
    yield* this.paginatedGet<TNProduct>("/products", filters)
  }

  async getVariants(productId: string | number): Promise<TNResult<TNVariant[]>> {
    return this.request<TNVariant[]>("GET", `/products/${productId}/variants`)
  }

  async updateVariantStock(
    productId: string | number,
    variantId: string | number,
    stock: number
  ): Promise<TNResult<TNVariant>> {
    return this.request<TNVariant>(
      "PUT",
      `/products/${productId}/variants/${variantId}`,
      { stock }
    )
  }

  // ==================== CUSTOMERS ====================

  async getCustomer(customerId: string | number): Promise<TNResult<TNCustomer>> {
    return this.request<TNCustomer>("GET", `/customers/${customerId}`)
  }

  async *getCustomers(filters?: Record<string, string>): AsyncGenerator<TNCustomer[]> {
    yield* this.paginatedGet<TNCustomer>("/customers", filters)
  }

  // ==================== TRANSACTIONS ====================

  async createTransaction(
    orderId: string | number,
    data: { payment_provider_id: string; status: string }
  ): Promise<TNResult<unknown>> {
    return this.request("POST", `/orders/${orderId}/transactions`, data)
  }

  // ==================== WEBHOOKS ====================

  async listWebhooks(): Promise<TNResult<TNWebhook[]>> {
    return this.request<TNWebhook[]>("GET", "/webhooks")
  }

  async createWebhook(event: string, url: string): Promise<TNResult<TNWebhook>> {
    return this.request<TNWebhook>("POST", "/webhooks", { event, url })
  }

  async deleteWebhook(webhookId: string | number): Promise<TNResult<void>> {
    return this.request<void>("DELETE", `/webhooks/${webhookId}`)
  }

  // ==================== STORE ====================

  async getStoreInfo(): Promise<TNResult<TNStore>> {
    return this.request<TNStore>("GET", "/store")
  }
}
