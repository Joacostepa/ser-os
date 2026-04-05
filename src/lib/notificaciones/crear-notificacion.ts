"use server"

import { createClient } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/pwa/enviar-push";

const NOTIFICACION_TEMPLATES: Record<
  string,
  {
    titulo: (d: Record<string, unknown>) => string;
    mensaje?: (d: Record<string, unknown>) => string;
    recurso_tipo: string;
    enviar_push: boolean;
  }
> = {
  pedido_nuevo: {
    titulo: (d) => `Nuevo pedido #${d.numero}`,
    mensaje: (d) => `${d.cliente} — $${(d.monto as number)?.toLocaleString("es-AR")}`,
    recurso_tipo: 'pedido',
    enviar_push: true,
  },
  pago_recibido: {
    titulo: (d) => `Pago recibido: $${(d.monto as number)?.toLocaleString("es-AR")}`,
    mensaje: (d) => `Pedido #${d.numero} — ${d.metodo}`,
    recurso_tipo: 'pedido',
    enviar_push: true,
  },
  checklist_completo: {
    titulo: (d) => `Checklist completo: Pedido #${d.numero}`,
    mensaje: () => 'Todos los pasos completados',
    recurso_tipo: 'pedido',
    enviar_push: true,
  },
  paso_asignado: {
    titulo: () => 'Nuevo paso asignado',
    mensaje: (d) => `${d.paso} — Pedido #${d.numero}`,
    recurso_tipo: 'pedido',
    enviar_push: true,
  },
  pedido_estancado: {
    titulo: (d) => `Pedido #${d.numero} estancado`,
    mensaje: (d) => `Sin avanzar hace ${d.dias} días`,
    recurso_tipo: 'pedido',
    enviar_push: true,
  },
  stock_critico: {
    titulo: (d) => `Stock crítico: ${d.insumo}`,
    mensaje: (d) => `Quedan ${d.stock} ${d.unidad} (mín: ${d.minimo})`,
    recurso_tipo: 'insumo',
    enviar_push: true,
  },
  pedido_nuevo_manual: {
    titulo: (d) => `Pedido manual #${d.numero}`,
    recurso_tipo: 'pedido',
    enviar_push: false,
  },
  pedido_habilitado: {
    titulo: (d) => `Pedido #${d.numero} habilitado`,
    recurso_tipo: 'pedido',
    enviar_push: false,
  },
  compra_recibida: {
    titulo: (d) => `Compra recibida: ${d.proveedor}`,
    recurso_tipo: 'compra',
    enviar_push: false,
  },
  pedido_despachado: {
    titulo: (d) => `Pedido #${d.numero} despachado`,
    recurso_tipo: 'pedido',
    enviar_push: false,
  },
};

function getRecursoUrl(tipo: string, id?: string): string {
  if (!id) return '/';
  const rutas: Record<string, string> = {
    pedido: `/pedidos/${id}`,
    compra: `/compras/${id}`,
    tarea: '/tareas',
    gasto: '/gastos',
    insumo: `/insumos/${id}`,
  };
  return rutas[tipo] || '/';
}

export async function crearNotificacion(input: {
  tipo: string;
  recurso_id?: string;
  datos: Record<string, unknown>;
  destinatarios: string[];
}) {
  const template = NOTIFICACION_TEMPLATES[input.tipo];
  if (!template) return;

  const supabase = await createClient();
  const url = getRecursoUrl(template.recurso_tipo, input.recurso_id);

  for (const usuarioId of input.destinatarios) {
    // Insert DB notification
    const { data: notif } = await supabase
      .from('notificaciones')
      .insert({
        tipo: 'interna',
        destinatario: usuarioId,
        asunto: template.titulo(input.datos),
        contenido: template.mensaje?.(input.datos) || '',
        pedido_id: template.recurso_tipo === 'pedido' ? input.recurso_id : null,
      })
      .select('id')
      .single();

    // Send push if template says so
    if (template.enviar_push) {
      // Check user preferences
      const { data: prefs } = await supabase
        .from('push_preferencias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      const tipoKey = input.tipo as string;
      const prefsRecord = prefs as Record<string, unknown> | null;
      if (!prefsRecord || prefsRecord[tipoKey] !== false) {
        try {
          await enviarPush(usuarioId, {
            title: template.titulo(input.datos),
            body: template.mensaje?.(input.datos) || '',
            url,
            tag: input.tipo,
            notificacion_id: notif?.id,
          });
        } catch {
          /* ignore push errors */
        }
      }
    }
  }
}
