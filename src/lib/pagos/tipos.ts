export interface PagoInput {
  pedido_id: string
  cliente_id: string
  monto: number
  tipo_pago: "anticipo" | "parcial" | "saldo" | "total"
  metodo_pago: string
  fecha: string // YYYY-MM-DD
  origen: "tienda_nube" | "manual"
  referencia_externa?: string
  comprobante_url?: string
  observaciones?: string
  generar_recibo?: boolean
}
