import { createClient } from "@supabase/supabase-js"
import { createTNClientForTienda } from "../factory"

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
            const { data: newProd, error } = await supabase
              .from("productos")
              .insert({
                nombre,
                sku: firstVariant?.sku || null,
                tipo: "estandar",
                costo_base: firstVariant?.cost ? parseFloat(firstVariant.cost) : null,
                precio_mayorista: firstVariant?.price ? parseFloat(firstVariant.price) : null,
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
            const varName = variant.values?.join(" - ") || nombre

            let varianteId: string

            const { data: existingVar } = variant.sku
              ? await supabase.from("variantes").select("id").eq("producto_id", productoId).eq("sku", variant.sku).single()
              : { data: null }

            if (existingVar) {
              varianteId = existingVar.id
              await supabase
                .from("variantes")
                .update({
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
