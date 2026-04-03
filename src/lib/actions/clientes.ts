"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getClientes(busqueda?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("clientes")
    .select("*, pedidos(count)")
    .order("created_at", { ascending: false })

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%,cuit.ilike.%${busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getCliente(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("clientes")
    .select(`
      *,
      pedidos(
        id, numero_tn, tipo, estado_interno, prioridad, monto_total, monto_pagado, saldo_pendiente, created_at
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

export async function crearCliente(data: {
  nombre: string
  email?: string
  telefono?: string
  cuit?: string
  categoria: "nuevo" | "recurrente" | "vip"
  notas?: string
}) {
  const supabase = await createClient()

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert({
      nombre: data.nombre,
      email: data.email || null,
      telefono: data.telefono || null,
      cuit: data.cuit || null,
      categoria: data.categoria,
      notas: data.notas || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/clientes")
  return cliente
}

export async function actualizarCliente(
  id: string,
  data: {
    nombre?: string
    email?: string
    telefono?: string
    cuit?: string
    categoria?: "nuevo" | "recurrente" | "vip"
    notas?: string
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("clientes")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
}
