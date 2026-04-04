export type EstadoPedido =
  | "nuevo"
  | "pendiente_de_sena"
  | "habilitado"
  | "en_prearmado"
  | "bloqueado"
  | "listo_para_armar"
  | "en_armado"
  | "armado_completo"
  | "pendiente_de_cobro"
  | "listo_para_despachar"
  | "despachado"
  | "entregado"
  | "cancelado"
  | "cerrado"

export type Subestado =
  | "pago_pendiente"
  | "esperando_diseno"
  | "esperando_aprobacion"
  | "esperando_insumo"
  | "faltante_stock"
  | "otro"

export interface DatosTransicion {
  subestado?: Subestado
  motivo?: string
  observaciones?: string
  transportista?: string
  codigo_seguimiento?: string
  tracking_url?: string
}

export interface ResultadoTransicion {
  valido: boolean
  error?: string
  condicionesFaltantes?: string[]
}

export interface Transicion {
  estado: string
  condiciones: string[]
  acciones: string[]
}
