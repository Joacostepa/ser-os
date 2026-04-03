// Tienda Nube API Response Types (v2025-03)

export interface TNOrder {
  id: number
  number: number
  token: string
  store_id: string
  status: "open" | "closed" | "cancelled"
  payment_status: "pending" | "authorized" | "paid" | "partially_paid" | "abandoned" | "refunded" | "partially_refunded" | "voided"
  shipping_status: "unpacked" | "shipped" | "unshipped" | "delivered" | "partially_packed" | "partially_fulfilled"
  contact_email: string
  contact_name: string
  contact_phone: string
  contact_identification: string
  subtotal: string
  discount: string
  total: string
  total_usd: string
  currency: string
  gateway: string
  gateway_name: string
  shipping_address: TNAddress | null
  billing_name: string
  billing_phone: string
  billing_address: string
  billing_city: string
  billing_province: string
  billing_country: string
  billing_zipcode: string
  note: string
  owner_note: string
  products: TNOrderProduct[]
  customer: TNCustomer | null
  storefront: string
  fulfillments: TNFulfillmentOrder[]
  paid_at: string | null
  cancelled_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  payment_details: {
    method: string
    credit_card_company: string | null
    installments: number
  } | null
}

export interface TNOrderProduct {
  id: number
  product_id: number
  variant_id: number
  name: string
  price: string
  quantity: number
  weight: string
  width: string
  height: string
  depth: string
  free_shipping: boolean
  properties: Record<string, string>[]
}

export interface TNAddress {
  address: string
  city: string
  province: string
  country: string
  zipcode: string
  floor: string
  locality: string
  phone: string
}

export interface TNProduct {
  id: number
  name: Record<string, string> | string
  description: Record<string, string> | string
  handle: Record<string, string> | string
  attributes: string[]
  variants: TNVariant[]
  images: TNImage[]
  categories: number[]
  published: boolean
  free_shipping: boolean
  requires_shipping: boolean
  tags: string
  brand: string
  created_at: string
  updated_at: string
}

export interface TNVariant {
  id: number
  product_id: number
  image_id: number | null
  price: string | null
  promotional_price: string | null
  stock_management: boolean
  stock: number | null
  sku: string | null
  barcode: string | null
  weight: string
  width: string
  height: string
  depth: string
  values: string[]
  cost: string | null
  created_at: string
  updated_at: string
}

export interface TNImage {
  id: number
  product_id: number
  src: string
  position: number
  created_at: string
  updated_at: string
}

export interface TNCustomer {
  id: number
  name: string
  email: string
  phone: string
  identification: string
  billing_address: string
  billing_city: string
  billing_province: string
  billing_country: string
  billing_zipcode: string
  total_spent: string
  total_spent_currency: string
  orders_count: number
  last_order_id: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface TNFulfillmentOrder {
  id: number
  order_id: number
  status: "UNPACKED" | "PACKED" | "SHIPPED" | "DELIVERED"
  shipping_type: "ship" | "pickup" | "non-shippable"
  assigned_location_id: number | null
  tracking_events: TNTrackingEvent[]
}

export interface TNTrackingEvent {
  id: number
  status: string
  description: string
  happened_at: string
  tracking_number: string | null
  tracking_url: string | null
  created_at: string
  updated_at: string
}

export interface TNWebhook {
  id: number
  event: string
  url: string
  created_at: string
  updated_at: string
}

export interface TNStore {
  id: number
  name: Record<string, string>
  email: string
  original_domain: string
  domains: string[]
  main_currency: string
  plan_name: string
}

export interface TNWebhookPayload {
  store_id: number
  event: string
  id: number
}

export type TNResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }
