import { z } from "zod"

export const itemPedidoSchema = z.object({
  producto_id: z.string().uuid().nullable(),
  variante_id: z.string().uuid().nullable(),
  descripcion: z.string().min(1, "La descripción es requerida"),
  cantidad: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  precio_unitario: z.number().min(0, "El precio debe ser positivo"),
  costo_unitario: z.number().min(0).nullable(),
  personalizacion: z.record(z.string(), z.unknown()).nullable(),
})

export const crearPedidoSchema = z.object({
  cliente_id: z.string().uuid("Seleccioná un cliente"),
  tipo: z.enum(["estandar", "personalizado"]),
  prioridad: z.enum(["urgente", "normal", "baja"]),
  fecha_comprometida: z.string().nullable(),
  tipo_despacho: z.enum(["envio", "retiro_oficina"]).nullable(),
  observaciones: z.string().nullable(),
  monto_total: z.number().min(0),
  items: z.array(itemPedidoSchema).min(1, "Agregá al menos un item"),
})

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>

export const actualizarEstadoSchema = z.object({
  pedido_id: z.string().uuid(),
  estado_interno: z.enum([
    "nuevo", "pendiente_sena", "sena_recibida", "en_prearmado",
    "esperando_insumos", "esperando_diseno", "insumos_recibidos",
    "listo_para_armar", "en_armado", "armado_completo",
    "pendiente_saldo", "listo_para_despacho", "en_preparacion_envio",
    "despachado", "cerrado", "cancelado",
  ]),
})
