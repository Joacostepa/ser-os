import type { WebhookContext } from "./index"

export async function handleProductCreated(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  const productResult = await client.getProduct(resourceId)
  if (!productResult.ok) {
    throw new Error(`Failed to fetch product ${resourceId}: ${productResult.error}`)
  }
  const product = productResult.data

  const nombre = typeof product.name === "string"
    ? product.name
    : product.name?.es || Object.values(product.name)[0] || "Sin nombre"

  // Check if product already exists locally by SKU or name
  let productoId: string | null = null

  const firstVariant = product.variants?.[0]
  if (firstVariant?.sku) {
    const { data: existing } = await supabase
      .from("productos")
      .select("id")
      .eq("sku", firstVariant.sku)
      .single()

    if (existing) productoId = existing.id
  }

  // Create product if not found
  if (!productoId) {
    const { data: newProduct, error } = await supabase
      .from("productos")
      .insert({
        nombre,
        sku: firstVariant?.sku || null,
        categoria: null,
        tipo: "estandar",
        costo_base: firstVariant?.cost ? parseFloat(firstVariant.cost) : null,
        precio_mayorista: firstVariant?.price ? parseFloat(firstVariant.price) : null,
        stock_minimo: 0,
        activo: product.published,
      })
      .select("id")
      .single()

    if (error) throw error
    productoId = newProduct.id
  }

  // Create junction record (producto ↔ tienda)
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

  // Create/update variants
  for (const variant of product.variants || []) {
    let varianteId: string | null = null

    // Look up by TN variant ID in junction table (not by SKU — multiple variants can share SKU)
    const { data: existingJunction } = await supabase
      .from("variantes_tienda")
      .select("variante_id")
      .eq("tienda_id", tienda.id)
      .eq("tienda_nube_variant_id", String(variant.id))
      .maybeSingle()

    if (existingJunction) {
      varianteId = existingJunction.variante_id
    }

    const variantName = variant.values
      ?.map((v: unknown) => typeof v === "string" ? v : (v && typeof v === "object" ? ((v as Record<string, string>).es || Object.values(v)[0]) : String(v)))
      .filter(Boolean)
      .join(" - ") || nombre

    if (varianteId) {
      await supabase.from("variantes").update({
        nombre: variantName,
        sku: variant.sku || null,
        stock_actual: variant.stock ?? 0,
        precio: variant.price ? parseFloat(variant.price) : null,
        costo: variant.cost ? parseFloat(variant.cost) : null,
      }).eq("id", varianteId)
    } else {
      const { data: newVar, error } = await supabase
        .from("variantes")
        .insert({
          producto_id: productoId,
          nombre: variantName,
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

    // Junction record (variante ↔ tienda)
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
}
