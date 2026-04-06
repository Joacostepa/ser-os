import type { WebhookContext } from "./index"

export async function handleProductUpdated(ctx: WebhookContext) {
  const { client, supabase, tienda, resourceId } = ctx

  const productResult = await client.getProduct(resourceId)
  if (!productResult.ok) {
    throw new Error(`Failed to fetch product ${resourceId}: ${productResult.error}`)
  }
  const product = productResult.data

  // Find local product via junction
  const { data: junction } = await supabase
    .from("productos_tienda")
    .select("producto_id")
    .eq("tienda_id", tienda.id)
    .eq("tienda_nube_product_id", String(product.id))
    .single()

  if (!junction) return // Product not tracked locally

  const nombre = typeof product.name === "string"
    ? product.name
    : product.name?.es || Object.values(product.name)[0] || "Sin nombre"

  // Update product
  await supabase
    .from("productos")
    .update({
      nombre,
      activo: product.published,
    })
    .eq("id", junction.producto_id)

  // Update junction
  await supabase
    .from("productos_tienda")
    .update({ publicado: product.published })
    .eq("tienda_id", tienda.id)
    .eq("tienda_nube_product_id", String(product.id))

  // Update variants
  for (const variant of product.variants || []) {
    const variantName = variant.values
      ?.map((v: unknown) => typeof v === "string" ? v : (v && typeof v === "object" ? ((v as Record<string, string>).es || Object.values(v)[0]) : String(v)))
      .filter(Boolean)
      .join(" - ") || nombre

    const { data: varJunction } = await supabase
      .from("variantes_tienda")
      .select("variante_id")
      .eq("tienda_id", tienda.id)
      .eq("tienda_nube_variant_id", String(variant.id))
      .maybeSingle()

    if (varJunction) {
      await supabase.from("variantes").update({
        nombre: variantName,
        sku: variant.sku || null,
        stock_actual: variant.stock ?? 0,
        precio: variant.price ? parseFloat(variant.price) : null,
        costo: variant.cost ? parseFloat(variant.cost) : null,
      }).eq("id", varJunction.variante_id)

      await supabase.from("variantes_tienda").update({
        stock_tn: variant.stock,
        precio_tn: variant.price ? parseFloat(variant.price) : null,
      }).eq("tienda_id", tienda.id).eq("tienda_nube_variant_id", String(variant.id))
    } else {
      // Variant doesn't exist locally — create it
      const { data: newVar } = await supabase.from("variantes").insert({
        producto_id: junction.producto_id,
        nombre: variantName,
        sku: variant.sku || null,
        stock_actual: variant.stock ?? 0,
        stock_reservado: 0,
        costo: variant.cost ? parseFloat(variant.cost) : null,
        precio: variant.price ? parseFloat(variant.price) : null,
      }).select("id").single()

      if (newVar) {
        await supabase.from("variantes_tienda").upsert({
          variante_id: newVar.id,
          tienda_id: tienda.id,
          tienda_nube_variant_id: String(variant.id),
          stock_tn: variant.stock,
          precio_tn: variant.price ? parseFloat(variant.price) : null,
        }, { onConflict: "tienda_id,tienda_nube_variant_id" })
      }
    }
  }
}
