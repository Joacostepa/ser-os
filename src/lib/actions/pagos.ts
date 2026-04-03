"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function registrarPago(data: {
  pedido_id: string
  cliente_id: string
  monto: number
  metodo: string
  concepto: "sena" | "saldo" | "pago_total"
  fecha: string
  notas?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase.from("pagos").insert({
    tipo: "cobro",
    pedido_id: data.pedido_id,
    cliente_id: data.cliente_id,
    monto: data.monto,
    metodo: data.metodo,
    concepto: data.concepto,
    fecha: data.fecha,
    notas: data.notas || null,
  })

  if (error) throw new Error(error.message)

  // Registrar en historial
  await supabase.from("historial_pedido").insert({
    pedido_id: data.pedido_id,
    accion: `Pago registrado: $${data.monto} (${data.concepto}) via ${data.metodo}`,
  })

  revalidatePath("/pagos")
  revalidatePath(`/pedidos/${data.pedido_id}`)
  revalidatePath("/")
}

export async function getPagos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pagos")
    .select(`
      *,
      pedido:pedidos(id, numero_tn),
      cliente:clientes(id, nombre)
    `)
    .eq("tipo", "cobro")
    .order("fecha", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getPedidosConSaldoPendiente() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id, numero_tn, monto_total, monto_pagado, saldo_pendiente, estado_interno, created_at,
      cliente:clientes(id, nombre, email)
    `)
    .gt("saldo_pendiente", 0)
    .not("estado_interno", "in", '("cerrado","cancelado")')
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
