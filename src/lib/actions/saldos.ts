"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getSaldosFavorCliente(clienteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("saldos_favor_clientes")
    .select("*, pedido:pedidos(numero_tn, numero_interno)")
    .eq("cliente_id", clienteId)
    .neq("estado", "devuelto")
    .order("created_at", { ascending: false })

  return data || []
}

export async function devolverSaldoFavor(saldoId: string, metodo: string, notas?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = user
    ? await supabase.from("usuarios").select("id").eq("auth_id", user.id).single()
    : { data: null }

  const { error } = await supabase.from("saldos_favor_clientes").update({
    estado: "devuelto",
    monto_disponible: 0,
    devuelto_en: new Date().toISOString(),
    devuelto_metodo: metodo,
    devuelto_por: usuario?.id || null,
    devuelto_notas: notas || null,
    updated_at: new Date().toISOString(),
  }).eq("id", saldoId)

  if (error) throw new Error("Error al devolver saldo: " + error.message)

  revalidatePath("/clientes")
}
