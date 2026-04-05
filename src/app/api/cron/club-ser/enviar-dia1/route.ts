import { createClient } from "@supabase/supabase-js"
import { sincronizarCuponesConTN } from "@/lib/club-ser/sincronizar-tn"
import { enviarEmail } from "@/lib/email/enviar-email"
import { getTemplateDia1, getAsunto, procesarTemplate } from "@/lib/club-ser/templates-email"

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 })

  const supabase = getAdminClient()
  const hoy = new Date()
  const mes = hoy.getMonth() + 1
  const anio = hoy.getFullYear()

  const { data: campana } = await supabase
    .from("club_ser_campanas")
    .select("*")
    .eq("mes", mes).eq("anio", anio)
    .single()

  if (!campana || campana.estado !== "aprobada") {
    return Response.json({ ok: false, reason: "Campaña no aprobada" })
  }

  // 1. Sincronizar cupones con TN
  await sincronizarCuponesConTN(campana.id)

  // 2. Enviar emails
  const { data: cupones } = await supabase
    .from("club_ser_cupones")
    .select("*, cliente:clientes(id, nombre, email)")
    .eq("campana_id", campana.id)

  let enviados = 0
  let errores = 0
  const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  for (const cupon of cupones || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cliente = cupon.cliente as any
    if (!cliente?.email) continue

    const template = getTemplateDia1(cupon.estado_cliente, cupon.nivel_cliente)
    const html = procesarTemplate(template, {
      nombre: cliente.nombre || "",
      descuento: cupon.valor,
      codigo: cupon.codigo,
      fecha_fin: `10 de ${meses[mes]}`,
      racha: cupon.estado_cliente === "activa" ? "1" : "0",
    })

    const ok = await enviarEmail({
      destinatario: cliente.email,
      nombre: cliente.nombre,
      asunto: getAsunto("dia1", cupon.estado_cliente, cupon.nivel_cliente),
      html,
      campanaId: campana.id,
      clienteId: cliente.id,
      tipo: "dia1",
    })

    if (ok) enviados++
    else errores++
    await new Promise((r) => setTimeout(r, 200))
  }

  await supabase.from("club_ser_campanas").update({
    estado: "ejecutada",
    emails_enviados: enviados,
    emails_error: errores,
    fecha_envio_dia1: new Date().toISOString(),
  }).eq("id", campana.id)

  return Response.json({ ok: true, enviados, errores })
}
