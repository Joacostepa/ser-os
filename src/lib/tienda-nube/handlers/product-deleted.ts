import type { WebhookContext } from "./index"

export async function handleProductDeleted(ctx: WebhookContext) {
  const { supabase, tienda, resourceId } = ctx

  // Find local product via junction
  const { data: junction } = await supabase
    .from("productos_tienda")
    .select("producto_id")
    .eq("tienda_id", tienda.id)
    .eq("tienda_nube_product_id", resourceId)
    .single()

  if (!junction) return

  // Soft delete: set activo = false
  await supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", junction.producto_id)

  // Remove junction record
  await supabase
    .from("productos_tienda")
    .delete()
    .eq("tienda_id", tienda.id)
    .eq("tienda_nube_product_id", resourceId)
}
