"use server"

import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { getClubConfig } from "@/lib/club-ser/config"

export async function enviarEmail(params: {
  destinatario: string
  nombre: string
  asunto: string
  html: string
  campanaId: number
  clienteId: string
  tipo: string
}) {
  const config = await getClubConfig()
  const supabase = await createClient()

  if (!process.env.RESEND_API_KEY) {
    await supabase.from("club_ser_emails").insert({
      campana_id: params.campanaId,
      cliente_id: params.clienteId,
      tipo: params.tipo,
      email_destino: params.destinatario,
      asunto: params.asunto,
      estado: "error",
      error_mensaje: "RESEND_API_KEY no configurada",
    })
    return false
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { data, error } = await resend.emails.send({
      from: `${config.email_sender_name} <${config.email_sender_email}>`,
      to: [params.destinatario],
      subject: params.asunto,
      html: params.html,
    })

    await supabase.from("club_ser_emails").insert({
      campana_id: params.campanaId,
      cliente_id: params.clienteId,
      tipo: params.tipo,
      email_destino: params.destinatario,
      asunto: params.asunto,
      estado: error ? "error" : "enviado",
      resend_email_id: data?.id || null,
      error_mensaje: error ? JSON.stringify(error) : null,
      fecha_envio: error ? null : new Date().toISOString(),
    })

    return !error
  } catch (err) {
    await supabase.from("club_ser_emails").insert({
      campana_id: params.campanaId,
      cliente_id: params.clienteId,
      tipo: params.tipo,
      email_destino: params.destinatario,
      asunto: params.asunto,
      estado: "error",
      error_mensaje: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
