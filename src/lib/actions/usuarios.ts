"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUsuarios() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido, email, rol, activo, area, avatar_url, ultimo_acceso, created_at")
    .order("nombre", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getUsuario(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function actualizarUsuario(
  id: string,
  data: {
    nombre?: string
    apellido?: string
    telefono?: string
    rol?: string
    area?: string
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("usuarios")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/usuarios")
  revalidatePath(`/configuracion/usuarios/${id}`)
}

export async function desactivarUsuario(id: string) {
  const supabase = await createClient()

  const { error: userError } = await supabase
    .from("usuarios")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (userError) throw new Error(userError.message)

  // Unassign pending tasks
  const { error: tareasError } = await supabase
    .from("tareas")
    .update({ responsable_id: null })
    .eq("responsable_id", id)
    .in("estado", ["pendiente", "en_proceso"])

  if (tareasError) throw new Error(tareasError.message)

  revalidatePath("/configuracion/usuarios")
  revalidatePath(`/configuracion/usuarios/${id}`)
}

export async function reactivarUsuario(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("usuarios")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/usuarios")
  revalidatePath(`/configuracion/usuarios/${id}`)
}

export async function invitarUsuario(data: {
  email: string
  nombre: string
  rol: string
  area?: string
  invitado_por: string
}) {
  const supabase = await createClient()

  // Check if email already exists in usuarios
  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", data.email)
    .maybeSingle()

  if (existing) throw new Error("Ya existe un usuario con ese email")

  // Check if there's already a pending invitation
  const { data: existingInv } = await supabase
    .from("invitaciones")
    .select("id")
    .eq("email", data.email)
    .eq("estado", "pendiente")
    .maybeSingle()

  if (existingInv) throw new Error("Ya existe una invitacion pendiente para ese email")

  // Generate token and expiration
  const token = crypto.randomUUID().replace(/-/g, "")
  const fechaExpiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  const { data: invitacion, error } = await supabase
    .from("invitaciones")
    .insert({
      email: data.email,
      nombre: data.nombre,
      rol: data.rol,
      area: data.area || null,
      invitado_por: data.invitado_por,
      token,
      estado: "pendiente",
      fecha_expiracion: fechaExpiracion,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/usuarios")
  return invitacion
}

export async function getInvitaciones() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("invitaciones")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function cancelarInvitacion(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("invitaciones")
    .update({ estado: "cancelada" })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/configuracion/usuarios")
}
