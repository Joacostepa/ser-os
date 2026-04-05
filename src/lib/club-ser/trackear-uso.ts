"use server"

import { createClient } from "@/lib/supabase/server"

export async function trackearUsoCupones(campanaId: number) {
  const supabase = await createClient()

  const { data: cupones } = await supabase
    .from("club_ser_cupones")
    .select("id, codigo, cliente_id")
    .eq("campana_id", campanaId)
    .eq("usado", false)

  for (const cupon of cupones || []) {
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id, tienda_nube_id, monto_total, monto_neto, descuento, created_at")
      .contains("cupones_usados", [cupon.codigo])

    if (pedidos && pedidos.length > 0) {
      const p = pedidos[0]
      await supabase.from("club_ser_cupones").update({
        usado: true,
        usado_en_pedido_id: p.id,
        usado_en_pedido_tn_id: p.tienda_nube_id ? Number(p.tienda_nube_id) : null,
        fecha_uso: p.created_at,
        monto_compra: p.monto_neto || p.monto_total,
        monto_descuento: p.descuento,
      }).eq("id", cupon.id)
    }
  }

  // Update campaign metrics
  const { count: usados } = await supabase
    .from("club_ser_cupones")
    .select("*", { count: "exact", head: true })
    .eq("campana_id", campanaId)
    .eq("usado", true)

  const { data: revenueData } = await supabase
    .from("club_ser_cupones")
    .select("monto_compra")
    .eq("campana_id", campanaId)
    .eq("usado", true)

  const revenue = revenueData?.reduce((s, c) => s + Number(c.monto_compra || 0), 0) || 0

  const { count: totalCupones } = await supabase
    .from("club_ser_cupones")
    .select("*", { count: "exact", head: true })
    .eq("campana_id", campanaId)

  await supabase.from("club_ser_campanas").update({
    cupones_usados: usados || 0,
    tasa_conversion: (totalCupones || 0) > 0 ? Math.round(((usados || 0) / (totalCupones || 1)) * 10000) / 100 : 0,
    revenue_generado: revenue,
  }).eq("id", campanaId)
}
