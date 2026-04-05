"use server"

import { createClient } from "@/lib/supabase/server"
import { getClubConfig } from "./config"

function generarCodigoAleatorio(longitud: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let r = ""
  for (let i = 0; i < longitud; i++) r += chars.charAt(Math.floor(Math.random() * chars.length))
  return r
}

function getPrefijoCupon(estado: string, nivel: string): string {
  const prefijos: Record<string, string> = {
    activa_estandar: "SER10",
    activa_vip: "VIP12",
    inactiva_estandar: "VOLVE5",
    inactiva_vip: "VOLVE7",
    reactivacion_estandar: "REACT5",
    reactivacion_vip: "REACT7",
    nunca_compro_estandar: "BIENVENIDA5",
  }
  return prefijos[`${estado}_${nivel}`] || "SER"
}

export async function generarCuponesCampana(campanaId: number) {
  const supabase = await createClient()
  const config = await getClubConfig()

  const { data: clientas } = await supabase
    .from("club_ser_clientas")
    .select("*, cliente:clientes(id, nombre, email)")
    .not("estado", "eq", "dormida")
    .gt("descuento_actual", 0)

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const dia10 = new Date(hoy.getFullYear(), hoy.getMonth(), 10)

  let count = 0
  for (const c of clientas || []) {
    const prefijo = getPrefijoCupon(c.estado, c.nivel)
    const codigo = `${prefijo}-${generarCodigoAleatorio(5)}`

    await supabase.from("club_ser_cupones").insert({
      campana_id: campanaId,
      cliente_id: c.cliente_id,
      codigo,
      tipo: "percentage",
      valor: c.descuento_actual,
      estado_cliente: c.estado,
      nivel_cliente: c.nivel,
      fecha_inicio: inicioMes.toISOString().split("T")[0],
      fecha_fin: dia10.toISOString().split("T")[0],
      monto_minimo: Number(config.monto_minimo_compra || 120000),
      max_usos: 1,
    })
    count++
  }

  await supabase.from("club_ser_campanas").update({ cupones_generados: count }).eq("id", campanaId)
  return count
}
