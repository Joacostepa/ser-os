import { createClient } from "@supabase/supabase-js"
import { clasificarClientas } from "@/lib/club-ser/clasificar-clientas"
import { generarCuponesCampana } from "@/lib/club-ser/generar-cupones"

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = getAdminClient()
  const mesRef = new Date()
  mesRef.setMonth(mesRef.getMonth() + 1)
  const mes = mesRef.getMonth() + 1
  const anio = mesRef.getFullYear()
  const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  // 1. Clasificar clientas
  const contadores = await clasificarClientas()

  // 2. Crear campaña
  const { data: campana } = await supabase.from("club_ser_campanas").insert({
    mes, anio,
    nombre: `Club SER — ${meses[mes]} ${anio}`,
    estado: "lista",
    total_clientas: contadores.total,
    activas: contadores.activas,
    inactivas: contadores.inactivas,
    dormidas: contadores.dormidas,
    reactivacion: contadores.reactivacion,
    nunca_compro: contadores.nunca_compro,
    vip: contadores.vip,
    estandar: contadores.estandar,
  }).select("id").single()

  if (!campana) return Response.json({ error: "Error creando campaña" }, { status: 500 })

  // 3. Generar cupones
  const cupones = await generarCuponesCampana(campana.id)

  return Response.json({ ok: true, campana_id: campana.id, cupones, contadores })
}
