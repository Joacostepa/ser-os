import { createClient } from "@supabase/supabase-js"

/**
 * Cron job: runs daily at 12:00 UTC.
 * Detects stalled pedidos and critical stock levels, creates notifications.
 *
 * Uses service-role client because cron requests have no user session.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const results = { estancados: 0, stock_critico: 0, errors: [] as string[] }

  // --- Detect stalled pedidos ---
  try {
    const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const hoy = new Date().toISOString().split("T")[0]

    const { data: estancados } = await supabase
      .from("pedidos")
      .select(
        "id, numero_tn, numero_interno, estado_interno, updated_at, cliente:clientes(nombre)",
      )
      .not("estado_interno", "in", '("cancelado","cerrado","entregado","despachado")')
      .lt("updated_at", hace5dias)

    // Get admin users to receive notifications
    const { data: admins } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin")
      .eq("activo", true)

    const adminIds = (admins || []).map((a) => a.id)

    for (const p of estancados || []) {
      const { count } = await supabase
        .from("notificaciones")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "pedido_estancado")
        .eq("recurso_id", p.id)
        .gte("created_at", hoy + "T00:00:00")

      if ((count ?? 0) === 0) {
        const dias = Math.floor(
          (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24),
        )
        const numero = p.numero_tn || p.numero_interno || p.id.slice(0, 8)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cliente = (p.cliente as any)?.nombre || ""
        const titulo = `Pedido #${numero} sin avanzar hace ${dias} dias`
        const mensaje = `${cliente} · Estado: ${p.estado_interno}`

        for (const uid of adminIds) {
          await supabase.from("notificaciones").insert({
            usuario_id: uid,
            tipo: "pedido_estancado",
            titulo,
            mensaje,
            recurso_tipo: "pedido",
            recurso_id: p.id,
            datos: { numero, cliente, estado: p.estado_interno, dias },
            leida: false,
            destinatario: uid,
            asunto: titulo,
            contenido: mensaje,
          })
        }
        results.estancados++
      }
    }
  } catch (err) {
    results.errors.push(`estancados: ${err instanceof Error ? err.message : String(err)}`)
  }

  // --- Detect critical stock ---
  try {
    const hoy = new Date().toISOString().split("T")[0]

    const { data: criticos } = await supabase
      .from("insumos")
      .select("id, nombre, stock_actual, stock_minimo, unidad")
      .eq("activo", true)
      .eq("tipo", "material")
      .gt("stock_minimo", 0)

    // Get admin + operaciones users
    const { data: destUsers } = await supabase
      .from("usuarios")
      .select("id, rol")
      .in("rol", ["admin", "operaciones"])
      .eq("activo", true)

    const destIds = (destUsers || []).map((u) => u.id)

    for (const insumo of criticos || []) {
      if (insumo.stock_actual >= insumo.stock_minimo) continue

      const { count } = await supabase
        .from("notificaciones")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "stock_critico")
        .eq("recurso_id", insumo.id)
        .gte("created_at", hoy + "T00:00:00")

      if ((count ?? 0) === 0) {
        const titulo = `Stock critico: ${insumo.nombre}`
        const mensaje = `Stock: ${insumo.stock_actual} ${insumo.unidad} · Min: ${insumo.stock_minimo} ${insumo.unidad}`

        for (const uid of destIds) {
          await supabase.from("notificaciones").insert({
            usuario_id: uid,
            tipo: "stock_critico",
            titulo,
            mensaje,
            recurso_tipo: "insumo",
            recurso_id: insumo.id,
            datos: {
              insumo_nombre: insumo.nombre,
              stock_actual: insumo.stock_actual,
              stock_minimo: insumo.stock_minimo,
              unidad: insumo.unidad,
            },
            leida: false,
            destinatario: uid,
            asunto: titulo,
            contenido: mensaje,
          })
        }
        results.stock_critico++
      }
    }
  } catch (err) {
    results.errors.push(`stock: ${err instanceof Error ? err.message : String(err)}`)
  }

  return Response.json({ ok: true, ...results })
}
