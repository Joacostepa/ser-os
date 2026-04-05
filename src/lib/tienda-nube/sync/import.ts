import { createClient } from "@supabase/supabase-js"
import { createTNClientForTienda } from "../factory"
import { ESTADO_INTERNO_A_PUBLICO } from "@/lib/constants"
import type { EstadoInterno } from "@/types/database"
import type { TNOrder } from "../types"
import { calcularNeto, calcularIVA } from "@/lib/iva"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function importProducts(tiendaId: string, jobId: string) {
  const supabase = getAdminClient()
  const { client, tienda } = await createTNClientForTienda(tiendaId)

  await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)

  let processed = 0
  const errors: string[] = []

  try {
    for await (const products of client.getProducts()) {
      for (const product of products) {
        try {
          const nombre = typeof product.name === "string"
            ? product.name
            : product.name?.es || Object.values(product.name)[0] || "Sin nombre"

          const firstVariant = product.variants?.[0]

          // Upsert product
          let productoId: string

          // Try to find by SKU first
          const { data: existing } = firstVariant?.sku
            ? await supabase.from("productos").select("id").eq("sku", firstVariant.sku).single()
            : { data: null }

          if (existing) {
            productoId = existing.id
            await supabase
              .from("productos")
              .update({ nombre, activo: product.published })
              .eq("id", productoId)
          } else {
            const precioMayorista = firstVariant?.price ? parseFloat(firstVariant.price) : null
            const { data: newProd, error } = await supabase
              .from("productos")
              .insert({
                nombre,
                sku: firstVariant?.sku || null,
                tipo: "estandar",
                costo_base: firstVariant?.cost ? parseFloat(firstVariant.cost) : null,
                precio_mayorista: precioMayorista,
                precio_neto: precioMayorista != null ? calcularNeto(precioMayorista) : null,
                stock_minimo: 0,
                activo: product.published,
              })
              .select("id")
              .single()

            if (error) throw error
            productoId = newProd.id
          }

          // Junction
          await supabase
            .from("productos_tienda")
            .upsert(
              {
                producto_id: productoId,
                tienda_id: tienda.id,
                tienda_nube_product_id: String(product.id),
                publicado: product.published,
              },
              { onConflict: "tienda_id,tienda_nube_product_id" }
            )

          // Variants
          for (const variant of product.variants || []) {
            const varName = variant.values
              ?.map((v: unknown) => typeof v === "string" ? v : (v && typeof v === "object" ? ((v as Record<string, string>).es || Object.values(v)[0]) : String(v)))
              .filter(Boolean)
              .join(" - ") || nombre

            let varianteId: string

            const { data: existingVar } = variant.sku
              ? await supabase.from("variantes").select("id").eq("producto_id", productoId).eq("sku", variant.sku).single()
              : { data: null }

            if (existingVar) {
              varianteId = existingVar.id
              await supabase
                .from("variantes")
                .update({
                  nombre: varName,
                  stock_actual: variant.stock ?? 0,
                  precio: variant.price ? parseFloat(variant.price) : null,
                  costo: variant.cost ? parseFloat(variant.cost) : null,
                })
                .eq("id", varianteId)
            } else {
              const { data: newVar, error } = await supabase
                .from("variantes")
                .insert({
                  producto_id: productoId,
                  nombre: varName,
                  sku: variant.sku || null,
                  stock_actual: variant.stock ?? 0,
                  stock_reservado: 0,
                  costo: variant.cost ? parseFloat(variant.cost) : null,
                  precio: variant.price ? parseFloat(variant.price) : null,
                })
                .select("id")
                .single()

              if (error) throw error
              varianteId = newVar.id
            }

            await supabase
              .from("variantes_tienda")
              .upsert(
                {
                  variante_id: varianteId,
                  tienda_id: tienda.id,
                  tienda_nube_variant_id: String(variant.id),
                  stock_tn: variant.stock,
                  precio_tn: variant.price ? parseFloat(variant.price) : null,
                },
                { onConflict: "tienda_id,tienda_nube_variant_id" }
              )
          }

          processed++
        } catch (err) {
          errors.push(`Product ${product.id}: ${err instanceof Error ? err.message : "Error"}`)
        }
      }

      // Update progress
      await supabase
        .from("sync_jobs")
        .update({ processed_items: processed, errors })
        .eq("id", jobId)
    }

    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        processed_items: processed,
        errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    // Update tienda last sync
    await supabase
      .from("tiendas")
      .update({ ultima_sincronizacion: new Date().toISOString() })
      .eq("id", tiendaId)
  } catch (err) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        errors: [...errors, err instanceof Error ? err.message : "Fatal error"],
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
  }
}

export async function importCustomers(tiendaId: string, jobId: string) {
  const supabase = getAdminClient()
  const { client, tienda } = await createTNClientForTienda(tiendaId)

  await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)

  let processed = 0

  try {
    for await (const customers of client.getCustomers()) {
      for (const customer of customers) {
        try {
          // Dedup by email
          let clienteId: string | null = null

          if (customer.email) {
            const { data: existing } = await supabase
              .from("clientes")
              .select("id")
              .eq("email", customer.email)
              .single()

            if (existing) clienteId = existing.id
          }

          if (!clienteId) {
            const { data: newCliente, error } = await supabase
              .from("clientes")
              .insert({
                nombre: customer.name || "Sin nombre",
                email: customer.email || null,
                telefono: customer.phone || null,
                cuit: customer.identification || null,
                categoria: "nuevo",
              })
              .select("id")
              .single()

            if (error) throw error
            clienteId = newCliente.id
          }

          // Junction
          await supabase
            .from("clientes_tienda")
            .upsert(
              {
                cliente_id: clienteId,
                tienda_id: tienda.id,
                tienda_nube_customer_id: String(customer.id),
              },
              { onConflict: "tienda_id,tienda_nube_customer_id" }
            )

          processed++
        } catch {
          // Skip individual errors
        }
      }

      await supabase
        .from("sync_jobs")
        .update({ processed_items: processed })
        .eq("id", jobId)
    }

    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        processed_items: processed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
  } catch (err) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        errors: [err instanceof Error ? err.message : "Fatal error"],
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
  }
}

export async function importOrders(tiendaId: string, jobId: string) {
  const supabase = getAdminClient()
  const { client, tienda } = await createTNClientForTienda(tiendaId)

  await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)

  let processed = 0
  const errors: string[] = []

  try {
    // Pre-load ALL existing TN order IDs in one query to skip them instantly
    const { data: existingOrders } = await supabase
      .from("pedidos")
      .select("tienda_nube_id, estado_interno, monto_pagado")
      .eq("tienda_id", tienda.id)
      .not("tienda_nube_id", "is", null)

    const existingMap = new Map<string, { estado_interno: string; monto_pagado: number }>()
    for (const o of existingOrders || []) {
      existingMap.set(o.tienda_nube_id, { estado_interno: o.estado_interno, monto_pagado: Number(o.monto_pagado || 0) })
    }

    // Fetch USD rate once for all orders
    let cotizacionUsd: number | null = null
    try {
      const { getCotizacionVenta } = await import("@/lib/dolar-api")
      cotizacionUsd = await getCotizacionVenta("blue")
    } catch { /* ignore */ }

    for await (const orders of client.getOrders({ sort_by: "created_at-asc" })) {
      for (const order of orders) {
        try {
          const tnId = String(order.id)
          const isPaid = order.payment_status === "paid"
          const montoTotal = parseFloat(order.total || "0")
          const montoPagado = isPaid ? montoTotal : 0

          // If already exists, update estado/pago if changed
          const existing = existingMap.get(tnId)
          if (existing) {
            const nuevoEstado: EstadoInterno = order.status === "cancelled"
              ? "cancelado"
              : order.status === "closed"
                ? "cerrado"
                : isPaid ? "sena_recibida" : "nuevo"

            if (existing.estado_interno !== nuevoEstado || existing.monto_pagado !== montoPagado) {
              await supabase.from("pedidos").update({
                estado_interno: nuevoEstado,
                estado_publico: ESTADO_INTERNO_A_PUBLICO[nuevoEstado],
                monto_pagado: montoPagado,
              }).eq("tienda_nube_id", tnId).eq("tienda_id", tienda.id)
            }
            processed++
            continue
          }

          // Find or create customer
          const clienteId = await findOrCreateClienteFromOrder(supabase, tienda, order)

          const estadoInterno: EstadoInterno = order.status === "cancelled"
            ? "cancelado"
            : order.status === "closed"
              ? "cerrado"
              : isPaid ? "sena_recibida" : "nuevo"
          const estadoPublico = ESTADO_INTERNO_A_PUBLICO[estadoInterno]

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cuponesUsados = (order as any).coupon
            ? (Array.isArray((order as any).coupon) ? (order as any).coupon : [(order as any).coupon])
            : []

          const { data: pedido, error: pedidoError } = await supabase
            .from("pedidos")
            .insert({
              numero_tn: String(order.number),
              tienda_nube_id: tnId,
              tienda_id: tienda.id,
              cliente_id: clienteId,
              canal: "tienda_nube",
              tipo: "sin_clasificar",
              estado_interno: estadoInterno,
              estado_publico: estadoPublico,
              prioridad: "normal",
              monto_total: montoTotal,
              monto_neto: calcularNeto(montoTotal),
              monto_iva: calcularIVA(montoTotal),
              monto_pagado: montoPagado,
              fecha_ingreso: order.created_at,
              tipo_despacho: order.shipping_address ? "envio" : "retiro_oficina",
              datos_envio: order.shipping_address,
              observaciones: order.note || null,
              cupones_usados: cuponesUsados,
              cotizacion_usd: cotizacionUsd,
              cotizacion_tipo: "blue",
              monto_total_usd: cotizacionUsd ? Math.round((montoTotal / cotizacionUsd) * 100) / 100 : null,
            })
            .select()
            .single()

          if (pedidoError) throw pedidoError

          // Create snapshot of original TN order
          try {
            await supabase.from("pedido_snapshot_tn").insert({
              pedido_id: pedido.id,
              data_original: order,
              tienda_nube_order_id: tnId,
            })
          } catch { /* ignore if snapshot table doesn't exist */ }

          // Create items
          if (order.products?.length > 0) {
            const items = []
            for (const p of order.products) {
              let producto_id: string | null = null
              let variante_id: string | null = null

              const { data: productoTienda } = await supabase
                .from("productos_tienda")
                .select("producto_id")
                .eq("tienda_id", tienda.id)
                .eq("tienda_nube_product_id", String(p.product_id))
                .single()

              if (productoTienda) producto_id = productoTienda.producto_id

              if (p.variant_id) {
                const { data: varianteTienda } = await supabase
                  .from("variantes_tienda")
                  .select("variante_id")
                  .eq("tienda_id", tienda.id)
                  .eq("tienda_nube_variant_id", String(p.variant_id))
                  .single()

                if (varianteTienda) variante_id = varianteTienda.variante_id
              }

              items.push({
                pedido_id: pedido.id,
                producto_id,
                variante_id,
                descripcion: p.name || "Producto",
                cantidad: p.quantity || 1,
                precio_unitario: parseFloat(p.price) || 0,
                precio_neto: calcularNeto(parseFloat(p.price) || 0),
                iva_unitario: calcularIVA(parseFloat(p.price) || 0),
              })
            }

            await supabase.from("items_pedido").insert(items)
          }

          await supabase.from("historial_pedido").insert({
            pedido_id: pedido.id,
            accion: `Pedido importado desde Tienda Nube (${tienda.canal})`,
            estado_nuevo: estadoInterno,
          })

          processed++
        } catch (err) {
          errors.push(`Order ${order.id}: ${err instanceof Error ? err.message : "Error"}`)
        }
      }

      await supabase
        .from("sync_jobs")
        .update({ processed_items: processed, errors })
        .eq("id", jobId)
    }

    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        processed_items: processed,
        errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    await supabase
      .from("tiendas")
      .update({ ultima_sincronizacion: new Date().toISOString() })
      .eq("id", tiendaId)
  } catch (err) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        errors: [...errors, err instanceof Error ? err.message : "Fatal error"],
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateClienteFromOrder(supabase: any, tienda: any, order: TNOrder): Promise<string> {
  const email = order.contact_email || order.customer?.email
  const nombre = order.contact_name || order.customer?.name || "Sin nombre"
  const telefono = order.contact_phone || order.customer?.phone
  const cuit = order.contact_identification || order.customer?.identification
  const tnCustomerId = order.customer?.id ? String(order.customer.id) : null

  let clienteId: string | null = null

  if (email) {
    const { data: existing } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", email)
      .limit(1)
      .single()

    if (existing) clienteId = existing.id
  }

  if (!clienteId && tnCustomerId) {
    const { data: junction } = await supabase
      .from("clientes_tienda")
      .select("cliente_id")
      .eq("tienda_id", tienda.id)
      .eq("tienda_nube_customer_id", tnCustomerId)
      .single()

    if (junction) clienteId = junction.cliente_id
  }

  if (!clienteId) {
    const { data: newCliente, error } = await supabase
      .from("clientes")
      .insert({
        nombre,
        email: email || null,
        telefono: telefono || null,
        cuit: cuit || null,
        categoria: "nuevo",
      })
      .select("id")
      .single()

    if (error) throw error
    clienteId = newCliente.id
  }

  if (tnCustomerId) {
    await supabase
      .from("clientes_tienda")
      .upsert(
        {
          cliente_id: clienteId,
          tienda_id: tienda.id,
          tienda_nube_customer_id: tnCustomerId,
        },
        { onConflict: "tienda_id,tienda_nube_customer_id" }
      )
  }

  return clienteId!
}
