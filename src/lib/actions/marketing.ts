"use server"

import { createClient } from "@/lib/supabase/server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDashboardMarketing(mes?: number, anio?: number): Promise<any> {
  const supabase = await createClient()
  const now = new Date()
  const targetMes = mes ?? now.getMonth() + 1
  const targetAnio = anio ?? now.getFullYear()

  // Get all club members
  const { data: clientas } = await supabase
    .from("club_clientas")
    .select("*, cliente:clientes(id, nombre, email)")

  const lista = clientas ?? []

  // Count by estado
  const estados = ["activa", "inactiva", "dormida", "reactivacion", "nunca_compro"]
  const distribucion = estados.map((estado) => ({
    estado,
    count: lista.filter((c) => c.estado === estado).length,
  }))
  const total = lista.length || 1

  // VIP count
  const vipCount = lista.filter((c) => c.nivel === "VIP").length

  // Last campaign
  const { data: lastCampana } = await supabase
    .from("campanas_marketing")
    .select("*, cupones:cupones_marketing(id, usado, monto_compra)")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const cupones = lastCampana?.cupones ?? []
  const usados = cupones.filter((c: { usado: boolean }) => c.usado)
  const tasaConversion = cupones.length > 0 ? (usados.length / cupones.length) * 100 : 0
  const revenueCupon = usados.reduce((s: number, c: { monto_compra: number }) => s + (c.monto_compra || 0), 0)

  // Conversion by estado
  const { data: cuponesDetalle } = await supabase
    .from("cupones_marketing")
    .select("*, clienta:club_clientas(estado)")
    .eq("campana_id", lastCampana?.id ?? "")

  const conversionPorEstado = estados.map((estado) => {
    const del = (cuponesDetalle ?? []).filter((c) => c.clienta?.estado === estado)
    const usadosDel = del.filter((c) => c.usado)
    return {
      estado,
      total: del.length,
      usaron: usadosDel.length,
      porcentaje: del.length > 0 ? Math.round((usadosDel.length / del.length) * 100) : 0,
    }
  })

  // Top 10 by racha
  const top10 = [...lista]
    .sort((a, b) => (b.racha_meses ?? 0) - (a.racha_meses ?? 0))
    .slice(0, 10)
    .map((c) => ({
      id: c.cliente?.id,
      nombre: c.cliente?.nombre ?? "---",
      nivel: c.nivel,
      racha: c.racha_meses ?? 0,
      total_facturado: c.total_facturado ?? 0,
    }))

  return {
    clientasActivas: lista.filter((c) => c.estado === "activa").length,
    tasaConversion: Math.round(tasaConversion * 10) / 10,
    revenueCupon,
    vipCount,
    distribucion,
    total: lista.length,
    conversionPorEstado,
    top10,
    mes: targetMes,
    anio: targetAnio,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClientasClub(filtros?: { estado?: string }): Promise<any> {
  const supabase = await createClient()

  let query = supabase
    .from("club_clientas")
    .select("*, cliente:clientes(id, nombre, email)")
    .order("created_at", { ascending: false })

  if (filtros?.estado && filtros.estado !== "todas") {
    query = query.eq("estado", filtros.estado)
  }

  const { data } = await query
  const lista = data ?? []

  const counts = {
    activas: lista.filter((c) => c.estado === "activa").length,
    inactivas: lista.filter((c) => c.estado === "inactiva").length,
    vip: lista.filter((c) => c.nivel === "VIP").length,
    total: lista.length,
  }

  // If filtering, re-count from all
  if (filtros?.estado && filtros.estado !== "todas") {
    const { data: all } = await supabase.from("club_clientas").select("estado, nivel")
    const allList = all ?? []
    counts.activas = allList.filter((c) => c.estado === "activa").length
    counts.inactivas = allList.filter((c) => c.estado === "inactiva").length
    counts.vip = allList.filter((c) => c.nivel === "VIP").length
    counts.total = allList.length
  }

  return {
    clientas: lista.map((c) => ({
      id: c.id,
      cliente_id: c.cliente?.id,
      nombre: c.cliente?.nombre ?? "---",
      email: c.cliente?.email,
      estado: c.estado,
      nivel: c.nivel,
      racha: c.racha_meses ?? 0,
      promedio: c.promedio_compra ?? 0,
      descuento: c.descuento_actual ?? 0,
    })),
    counts,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClientaDetalle(clienteId: string): Promise<any> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("club_clientas")
    .select("*, cliente:clientes(id, nombre, email, telefono), cupones:cupones_marketing(id, codigo, descuento, usado, fecha_uso, monto_compra, campana_id)")
    .eq("cliente_id", clienteId)
    .single()

  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCampanas(): Promise<any[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("campanas_marketing")
    .select("*, cupones:cupones_marketing(id, usado, monto_compra)")
    .order("created_at", { ascending: false })

  return (data ?? []).map((c) => {
    const cupones = c.cupones ?? []
    const usados = cupones.filter((cu: { usado: boolean }) => cu.usado)
    const revenue = usados.reduce((s: number, cu: { monto_compra: number }) => s + (cu.monto_compra || 0), 0)
    return {
      id: c.id,
      nombre: c.nombre,
      mes: c.mes,
      anio: c.anio,
      estado: c.estado,
      cupones_count: cupones.length,
      tasa_conversion: cupones.length > 0 ? Math.round((usados.length / cupones.length) * 100) : 0,
      revenue,
      created_at: c.created_at,
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCampanaDetalle(id: string): Promise<any> {
  const supabase = await createClient()
  const { data: campana } = await supabase
    .from("campanas_marketing")
    .select("*")
    .eq("id", id)
    .single()

  if (!campana) return null

  const { data: cupones } = await supabase
    .from("cupones_marketing")
    .select("*, clienta:club_clientas(estado, nivel, cliente:clientes(id, nombre))")
    .eq("campana_id", id)
    .order("created_at", { ascending: false })

  const { data: emailLogs } = await supabase
    .from("email_logs_marketing")
    .select("*")
    .eq("campana_id", id)

  const cuponesLista = cupones ?? []
  const logs = emailLogs ?? []

  // Count by estado
  const estados = ["activa", "inactiva", "dormida", "reactivacion", "nunca_compro"]
  const countByEstado = estados.reduce((acc, estado) => {
    acc[estado] = cuponesLista.filter((c) => c.clienta?.estado === estado).length
    return acc
  }, {} as Record<string, number>)

  const vipCount = cuponesLista.filter((c) => c.clienta?.nivel === "VIP").length
  const estCount = cuponesLista.length - vipCount

  return {
    ...campana,
    cupones: cuponesLista.map((c) => ({
      id: c.id,
      cliente_nombre: c.clienta?.cliente?.nombre ?? "---",
      cliente_id: c.clienta?.cliente?.id,
      estado_clienta: c.clienta?.estado,
      nivel: c.clienta?.nivel,
      codigo: c.codigo,
      descuento: c.descuento,
      usado: c.usado,
      pedido_id: c.pedido_id,
      fecha_uso: c.fecha_uso,
      monto_compra: c.monto_compra,
    })),
    countByEstado,
    vipCount,
    estCount,
    totalCupones: cuponesLista.length,
    emailLogs: {
      enviados: logs.filter((l) => l.estado === "enviado").length,
      errores: logs.filter((l) => l.estado === "error").length,
      byTipo: {
        dia1: logs.filter((l) => l.tipo === "dia1").length,
        dia10: logs.filter((l) => l.tipo === "dia10").length,
        dia27: logs.filter((l) => l.tipo === "dia27").length,
      },
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function prepararCampana(mes: number, anio: number): Promise<any> {
  const supabase = await createClient()

  // Check if campaign already exists
  const { data: existing } = await supabase
    .from("campanas_marketing")
    .select("id")
    .eq("mes", mes)
    .eq("anio", anio)
    .single()

  if (existing) {
    throw new Error(`Ya existe una campana para ${mes}/${anio}`)
  }

  const nombre = `Campana ${mes.toString().padStart(2, "0")}/${anio}`

  const { data: campana, error } = await supabase
    .from("campanas_marketing")
    .insert({ nombre, mes, anio, estado: "borrador" })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Generate coupons for all club members
  const { data: clientas } = await supabase
    .from("club_clientas")
    .select("id, estado, nivel, descuento_actual")

  const cupones = (clientas ?? []).map((c) => ({
    campana_id: campana.id,
    clienta_id: c.id,
    codigo: `SER-${mes.toString().padStart(2, "0")}${anio}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    descuento: c.descuento_actual ?? 10,
    usado: false,
  }))

  if (cupones.length > 0) {
    await supabase.from("cupones_marketing").insert(cupones)
  }

  return campana
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aprobarCampana(id: string): Promise<any> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("campanas_marketing")
    .update({ estado: "aprobada", aprobada_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClubConfigAction(): Promise<Record<string, any>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("club_config")
    .select("clave, valor")

  const config: Record<string, string> = {}
  for (const item of data ?? []) {
    config[item.clave] = item.valor
  }
  return config
}

export async function updateClubConfig(clave: string, valor: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("club_config")
    .upsert({ clave, valor }, { onConflict: "clave" })

  if (error) throw new Error(error.message)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCuponesHistorial(filtros?: { busqueda?: string; estado?: string; campana_id?: string }): Promise<any[]> {
  const supabase = await createClient()

  let query = supabase
    .from("cupones_marketing")
    .select("*, clienta:club_clientas(estado, nivel, cliente:clientes(id, nombre)), campana:campanas_marketing(id, nombre)")
    .order("created_at", { ascending: false })

  if (filtros?.campana_id && filtros.campana_id !== "todas") {
    query = query.eq("campana_id", filtros.campana_id)
  }
  if (filtros?.estado === "usado") {
    query = query.eq("usado", true)
  } else if (filtros?.estado === "no_usado") {
    query = query.eq("usado", false)
  }

  const { data } = await query
  let lista = data ?? []

  if (filtros?.busqueda) {
    const term = filtros.busqueda.toLowerCase()
    lista = lista.filter(
      (c) =>
        c.codigo?.toLowerCase().includes(term) ||
        c.clienta?.cliente?.nombre?.toLowerCase().includes(term)
    )
  }

  return lista.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    cliente_nombre: c.clienta?.cliente?.nombre ?? "---",
    cliente_id: c.clienta?.cliente?.id,
    estado_clienta: c.clienta?.estado,
    nivel: c.clienta?.nivel,
    descuento: c.descuento,
    usado: c.usado,
    fecha_uso: c.fecha_uso,
    monto_compra: c.monto_compra,
    campana_nombre: c.campana?.nombre,
  }))
}
