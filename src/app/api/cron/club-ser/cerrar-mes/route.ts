import { createClient } from "@supabase/supabase-js"
import { trackearUsoCupones } from "@/lib/club-ser/trackear-uso"
import { limpiarCuponesVencidosTN } from "@/lib/club-ser/sincronizar-tn"

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Close previous month's campaign
  const hoy = new Date()
  const mesAnterior = hoy.getMonth() === 0 ? 12 : hoy.getMonth()
  const anioAnterior = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()

  const { data: campana } = await supabase
    .from("club_ser_campanas")
    .select("id, estado")
    .eq("mes", mesAnterior).eq("anio", anioAnterior)
    .single()

  if (!campana) return Response.json({ ok: false, reason: "Sin campaña del mes anterior" })

  // Final tracking
  await trackearUsoCupones(campana.id)

  // Clean up TN coupons
  await limpiarCuponesVencidosTN(campana.id)

  // Mark as completed
  await supabase.from("club_ser_campanas")
    .update({ estado: "completada" })
    .eq("id", campana.id)

  return Response.json({ ok: true, campana_id: campana.id })
}
