"use server"

import { createClient } from "@/lib/supabase/server"

export async function sincronizarCuponesConTN(campanaId: number) {
  const supabase = await createClient()

  // Get first tienda for TN API access
  const { data: tienda } = await supabase
    .from("tiendas")
    .select("tienda_nube_store_id, access_token")
    .limit(1)
    .single()

  if (!tienda) return { sincronizados: 0, errores: 0 }

  const { data: cupones } = await supabase
    .from("club_ser_cupones")
    .select("*")
    .eq("campana_id", campanaId)
    .eq("sincronizado_tn", false)

  let sincronizados = 0
  let errores = 0

  for (const cupon of cupones || []) {
    try {
      const res = await fetch(
        `https://api.tiendanube.com/v1/${tienda.tienda_nube_store_id}/coupons`,
        {
          method: "POST",
          headers: {
            Authentication: `bearer ${tienda.access_token}`,
            "Content-Type": "application/json",
            "User-Agent": "SER-Mayorista-App (contacto@sermayorista.com)",
          },
          body: JSON.stringify({
            code: cupon.codigo,
            type: "percentage",
            value: cupon.valor.toString(),
            max_uses: cupon.max_usos,
            includes_shipping: false,
            min_price: cupon.monto_minimo,
            start_date: cupon.fecha_inicio,
            end_date: cupon.fecha_fin,
            combines_with_other_discounts: false,
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        await supabase.from("club_ser_cupones").update({
          tienda_nube_id: data.id,
          sincronizado_tn: true,
          fecha_sincronizado: new Date().toISOString(),
        }).eq("id", cupon.id)
        sincronizados++
      } else {
        errores++
      }
    } catch {
      errores++
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  await supabase.from("club_ser_campanas").update({ cupones_sincronizados_tn: sincronizados }).eq("id", campanaId)
  return { sincronizados, errores }
}

export async function limpiarCuponesVencidosTN(campanaId: number) {
  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from("tiendas")
    .select("tienda_nube_store_id, access_token")
    .limit(1)
    .single()

  if (!tienda) return

  const { data: cupones } = await supabase
    .from("club_ser_cupones")
    .select("tienda_nube_id")
    .eq("campana_id", campanaId)
    .eq("sincronizado_tn", true)
    .not("tienda_nube_id", "is", null)

  for (const cupon of cupones || []) {
    try {
      await fetch(
        `https://api.tiendanube.com/v1/${tienda.tienda_nube_store_id}/coupons/${cupon.tienda_nube_id}`,
        {
          method: "DELETE",
          headers: {
            Authentication: `bearer ${tienda.access_token}`,
            "User-Agent": "SER-Mayorista-App (contacto@sermayorista.com)",
          },
        }
      )
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 200))
  }
}
