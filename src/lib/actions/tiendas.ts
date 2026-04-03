"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTiendas() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tiendas")
    .select("*")
    .order("created_at")

  if (error) throw new Error(error.message)
  return data
}

export async function addTienda(data: {
  nombre: string
  canal: "mayorista" | "minorista"
  tienda_nube_store_id: string
  access_token: string
  webhook_secret?: string
}) {
  const supabase = await createClient()

  const { data: tienda, error } = await supabase
    .from("tiendas")
    .insert({
      nombre: data.nombre,
      canal: data.canal,
      tienda_nube_store_id: data.tienda_nube_store_id,
      access_token: data.access_token,
      webhook_secret: data.webhook_secret || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/configuracion/integracion")
  return tienda
}

export async function updateTienda(
  id: string,
  data: {
    nombre?: string
    access_token?: string
    webhook_secret?: string
    activa?: boolean
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tiendas")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/integracion")
}

export async function removeTienda(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tiendas")
    .update({ activa: false })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/integracion")
}
