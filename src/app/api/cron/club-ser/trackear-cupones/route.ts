import { createClient } from "@supabase/supabase-js"
import { trackearUsoCupones } from "@/lib/club-ser/trackear-uso"

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const hoy = new Date()

  const { data: campana } = await supabase
    .from("club_ser_campanas")
    .select("id")
    .eq("mes", hoy.getMonth() + 1).eq("anio", hoy.getFullYear())
    .in("estado", ["ejecutada", "aprobada"])
    .single()

  if (!campana) return Response.json({ ok: false, reason: "Sin campaña activa" })

  await trackearUsoCupones(campana.id)
  return Response.json({ ok: true, campana_id: campana.id })
}
