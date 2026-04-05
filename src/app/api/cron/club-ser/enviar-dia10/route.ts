import { createClient } from "@supabase/supabase-js"
import { enviarEmail } from "@/lib/email/enviar-email"
import { getTemplateDia10, getAsunto, procesarTemplate } from "@/lib/club-ser/templates-email"

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const hoy = new Date()

  const { data: campana } = await supabase
    .from("club_ser_campanas")
    .select("*")
    .eq("mes", hoy.getMonth() + 1).eq("anio", hoy.getFullYear())
    .single()

  if (!campana || !["ejecutada", "aprobada"].includes(campana.estado)) {
    return Response.json({ ok: false, reason: "Sin campaña activa" })
  }

  const { data: cupones } = await supabase
    .from("club_ser_cupones")
    .select("*, cliente:clientes(id, nombre, email)")
    .eq("campana_id", campana.id)
    .eq("usado", false)

  let enviados = 0
  for (const cupon of cupones || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cliente = cupon.cliente as any
    if (!cliente?.email) continue

    const html = procesarTemplate(getTemplateDia10(), {
      nombre: cliente.nombre, descuento: cupon.valor, codigo: cupon.codigo, fecha_fin: "fin de mes",
    })

    const ok = await enviarEmail({
      destinatario: cliente.email, nombre: cliente.nombre,
      asunto: getAsunto("dia10", cupon.estado_cliente, cupon.nivel_cliente),
      html, campanaId: campana.id, clienteId: cliente.id, tipo: "dia10",
    })
    if (ok) enviados++
    await new Promise((r) => setTimeout(r, 200))
  }

  await supabase.from("club_ser_campanas").update({ fecha_envio_dia10: new Date().toISOString() }).eq("id", campana.id)
  return Response.json({ ok: true, enviados })
}
