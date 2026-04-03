"use server"

import { createClient } from "@/lib/supabase/server"

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", user.id)
    .single()

  return usuario
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
