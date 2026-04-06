"use server"

import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const NOTIFICACION_TEMPLATES: Record<
  string,
  {
    titulo: (d: Record<string, unknown>) => string
    mensaje?: (d: Record<string, unknown>) => string
    icono: string
    color: string
    recurso_tipo: string
    enviar_push: boolean
    destinatarios_roles: string[]
  }
> = {
  pedido_nuevo: {
    titulo: (d) => `Nuevo pedido #${d.numero} — ${d.cliente}`,
    mensaje: (d) => `$${fmt(d.monto)} · ${d.items_count} items`,
    icono: "Package",
    color: "text-blue-500",
    recurso_tipo: "pedido",
    enviar_push: true,
    destinatarios_roles: ["admin"],
  },
  pedido_nuevo_manual: {
    titulo: (d) => `Pedido manual ${d.numero} — ${d.cliente}`,
    mensaje: (d) => `Canal: ${d.canal} · $${fmt(d.monto)}`,
    icono: "Package",
    color: "text-blue-500",
    recurso_tipo: "pedido",
    enviar_push: false,
    destinatarios_roles: ["admin"],
  },
  pago_recibido: {
    titulo: (d) => `Pago recibido: $${fmt(d.monto)} — #${d.pedido_numero}`,
    mensaje: (d) => `${d.tipo_pago} via ${d.metodo} · ${d.cliente}`,
    icono: "CreditCard",
    color: "text-green-500",
    recurso_tipo: "pedido",
    enviar_push: true,
    destinatarios_roles: ["admin", "contable"],
  },
  pedido_habilitado: {
    titulo: (d) => `Pedido #${d.numero} habilitado`,
    mensaje: (d) => `${d.cliente} · Tipo: ${d.tipo}`,
    icono: "CheckCircle",
    color: "text-green-500",
    recurso_tipo: "pedido",
    enviar_push: false,
    destinatarios_roles: ["admin"],
  },
  checklist_completo: {
    titulo: (d) => `Checklist completo — #${d.numero}`,
    mensaje: (d) => `Todos los pasos de ${d.cliente} terminados`,
    icono: "CheckSquare",
    color: "text-green-600",
    recurso_tipo: "pedido",
    enviar_push: true,
    destinatarios_roles: ["admin"],
  },
  paso_asignado: {
    titulo: (d) => `Nuevo paso asignado: ${d.paso_titulo}`,
    mensaje: (d) => `Pedido #${d.pedido_numero} — ${d.cliente}`,
    icono: "UserPlus",
    color: "text-blue-500",
    recurso_tipo: "pedido",
    enviar_push: true,
    destinatarios_roles: ["asignado"],
  },
  pedido_estancado: {
    titulo: (d) => `Pedido #${d.numero} sin avanzar hace ${d.dias} dias`,
    mensaje: (d) => `${d.cliente} · Estado: ${d.estado}`,
    icono: "AlertTriangle",
    color: "text-amber-500",
    recurso_tipo: "pedido",
    enviar_push: true,
    destinatarios_roles: ["admin"],
  },
  stock_critico: {
    titulo: (d) => `Stock critico: ${d.insumo_nombre}`,
    mensaje: (d) =>
      `Stock: ${d.stock_actual} ${d.unidad} · Min: ${d.stock_minimo} ${d.unidad}`,
    icono: "AlertTriangle",
    color: "text-red-500",
    recurso_tipo: "insumo",
    enviar_push: true,
    destinatarios_roles: ["admin", "operaciones"],
  },
  compra_recibida: {
    titulo: (d) => `Mercaderia recibida — OC #${d.oc_numero}`,
    mensaje: (d) => `${d.proveedor} · ${d.items_recibidos} items`,
    icono: "Truck",
    color: "text-teal-500",
    recurso_tipo: "compra",
    enviar_push: false,
    destinatarios_roles: ["admin", "operaciones"],
  },
  gasto_recurrente: {
    titulo: (d) => `${d.cantidad} gastos recurrentes pendientes`,
    mensaje: () => "Hay gastos mensuales sin cargar",
    icono: "Repeat",
    color: "text-amber-500",
    recurso_tipo: "gasto",
    enviar_push: false,
    destinatarios_roles: ["admin", "contable"],
  },
  pedido_editado: {
    titulo: (d) => `Pedido #${d.numero} editado`,
    mensaje: (d) => `Total: $${fmt(d.total_anterior)} → $${fmt(d.total_nuevo)}`,
    icono: "Pencil",
    color: "text-stone-500",
    recurso_tipo: "pedido",
    enviar_push: false,
    destinatarios_roles: ["admin"],
  },
  pago_proveedor: {
    titulo: (d) => `Pago a ${d.proveedor}: $${fmt(d.monto)}`,
    mensaje: (d) => `OC #${d.oc_numero} · ${d.metodo}`,
    icono: "CreditCard",
    color: "text-amber-500",
    recurso_tipo: "compra",
    enviar_push: false,
    destinatarios_roles: ["admin", "contable"],
  },
  pedido_despachado: {
    titulo: (d) => `Pedido #${d.numero} despachado`,
    mensaje: (d) => `${d.cliente}`,
    icono: "Truck",
    color: "text-green-500",
    recurso_tipo: "pedido",
    enviar_push: false,
    destinatarios_roles: ["admin"],
  },
  pedido_sin_clasificar: {
    titulo: (d) => `${d.cantidad} pedidos sin clasificar`,
    mensaje: () => "Clasificalos para poder habilitarlos",
    icono: "Tag",
    color: "text-amber-500",
    recurso_tipo: "pedido",
    enviar_push: false,
    destinatarios_roles: ["admin"],
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function crearNotificacion(input: {
  tipo: string
  datos: Record<string, unknown>
  recurso_id?: string
  actor_id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
}) {
  const template = NOTIFICACION_TEMPLATES[input.tipo]
  if (!template) return

  const supabase = input.supabaseClient || await createClient()

  // Resolve destinatarios by role
  const destinatarios = await getDestinatarios(
    supabase,
    template.destinatarios_roles,
    input.datos,
    input.actor_id,
  )

  for (const usuarioId of destinatarios) {
    // Insert notification with NEW schema columns
    const { data: notif } = await supabase
      .from("notificaciones")
      .insert({
        usuario_id: usuarioId,
        tipo: input.tipo,
        titulo: template.titulo(input.datos),
        mensaje: template.mensaje?.(input.datos) || null,
        recurso_tipo: template.recurso_tipo,
        recurso_id: input.recurso_id || null,
        datos: input.datos,
        leida: false,
        // Legacy columns for backwards compat
        destinatario: usuarioId,
        asunto: template.titulo(input.datos),
        contenido: template.mensaje?.(input.datos) || "",
      })
      .select("id")
      .single()

    // Send push if configured
    if (template.enviar_push && notif?.id) {
      try {
        const { data: prefs } = await supabase
          .from("push_preferencias")
          .select("*")
          .eq("usuario_id", usuarioId)
          .single()

        const tipoKey = input.tipo as string
        const prefsRecord = prefs as Record<string, unknown> | null
        if (!prefsRecord || prefsRecord[tipoKey] !== false) {
          const { enviarPush } = await import("@/lib/pwa/enviar-push")
          await enviarPush(usuarioId, {
            title: template.titulo(input.datos),
            body: template.mensaje?.(input.datos) || "",
            url: getRecursoUrl(template.recurso_tipo, input.recurso_id),
            tag: input.tipo,
            notificacion_id: notif.id,
          })
        }
      } catch {
        /* ignore push errors */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDestinatarios(
  supabase: any,
  roles: string[],
  datos: Record<string, unknown>,
  actorId?: string,
): Promise<string[]> {
  const usuarios: string[] = []

  for (const rol of roles) {
    if (rol === "asignado") {
      if (datos.asignado_a) usuarios.push(datos.asignado_a as string)
    } else {
      const { data } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol", rol)
        .eq("activo", true)
      for (const u of data || []) {
        if (!usuarios.includes(u.id)) usuarios.push(u.id)
      }
    }
  }

  // Exclude actor (don't notify the person who triggered the action)
  return actorId ? usuarios.filter((id: string) => id !== actorId) : usuarios
}

function getRecursoUrl(tipo: string, id?: string): string {
  if (!id) return "/"
  const rutas: Record<string, string> = {
    pedido: `/pedidos/${id}`,
    compra: `/compras/${id}`,
    insumo: `/insumos/${id}`,
    gasto: "/gastos",
    tarea: "/tareas",
  }
  return rutas[tipo] || "/"
}

function fmt(n: unknown): string {
  return Number(n || 0).toLocaleString("es-AR")
}
