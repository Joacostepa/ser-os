"use server"

import { crearAsiento } from "./asientos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onVentaConfirmada(pedido: any) {
  const monto = Number(pedido.monto_total)
  if (monto <= 0) return

  // Asiento de venta: CxC (debe) / Ventas (haber)
  await crearAsiento({
    fecha: new Date(),
    descripcion: `Venta — Pedido #${pedido.numero_tn || pedido.id.slice(0, 8)} — ${pedido.cliente?.nombre || ""}`,
    tipo: "venta",
    referencia_tipo: "pedido",
    referencia_id: pedido.id,
    lineas: [
      { cuenta_codigo: "1.1.2", debe: monto, haber: 0 },
      { cuenta_codigo: "4.1.1", debe: 0, haber: monto },
    ],
  })

  // Asiento de CMV si hay costos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const costoTotal = pedido.items?.reduce((s: number, i: any) =>
    s + (Number(i.costo_unitario || 0) * Number(i.cantidad)), 0) ?? 0

  if (costoTotal > 0) {
    await crearAsiento({
      fecha: new Date(),
      descripcion: `CMV — Pedido #${pedido.numero_tn || pedido.id.slice(0, 8)}`,
      tipo: "venta",
      referencia_tipo: "pedido",
      referencia_id: pedido.id,
      lineas: [
        { cuenta_codigo: "5.1.1", debe: costoTotal, haber: 0 },
        { cuenta_codigo: "1.1.3", debe: 0, haber: costoTotal },
      ],
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onCobroRegistrado(pago: any) {
  const monto = Number(pago.monto)
  if (monto <= 0) return

  // Cobro normal: Caja (debe) / CxC (haber)
  await crearAsiento({
    fecha: pago.fecha || new Date(),
    descripcion: `Cobro — Pedido #${pago.pedido_numero || ""} — $${monto.toLocaleString("es-AR")}`,
    tipo: "cobro",
    referencia_tipo: "pedido",
    referencia_id: pago.pedido_id,
    lineas: [
      { cuenta_codigo: "1.1.1", debe: monto, haber: 0, descripcion: pago.metodo },
      { cuenta_codigo: "1.1.2", debe: 0, haber: monto },
    ],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onCompraRecibida(compra: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monto = compra.items?.reduce((s: number, i: any) =>
    s + (Number(i.precio_unitario) * Number(i.cantidad)), 0) ?? 0
  if (monto <= 0) return

  // Compra: Inventario (debe) / CxP (haber)
  await crearAsiento({
    fecha: new Date(),
    descripcion: `Compra — ${compra.proveedor?.nombre || ""} — OC #${compra.id.slice(0, 8)}`,
    tipo: "compra",
    referencia_tipo: "compra",
    referencia_id: compra.id,
    lineas: [
      { cuenta_codigo: "1.1.3", debe: monto, haber: 0 },
      { cuenta_codigo: "2.1.1", debe: 0, haber: monto },
    ],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onPagoProveedorRegistrado(pago: any) {
  const monto = Number(pago.monto)
  if (monto <= 0) return

  // Pago: CxP (debe) / Caja (haber)
  await crearAsiento({
    fecha: pago.fecha || new Date(),
    descripcion: `Pago — ${pago.proveedor_nombre || ""} — $${monto.toLocaleString("es-AR")}`,
    tipo: "pago_proveedor",
    referencia_tipo: "compra",
    referencia_id: pago.compra_id,
    lineas: [
      { cuenta_codigo: "2.1.1", debe: monto, haber: 0 },
      { cuenta_codigo: "1.1.1", debe: 0, haber: monto, descripcion: pago.metodo },
    ],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onGastoRegistrado(gasto: any) {
  const monto = Number(gasto.monto)
  if (monto <= 0) return

  const cuentaCodigo = gasto.cuenta_codigo || "6.2.13" // default: otros gastos
  const contrapartida = gasto.pagado ? "1.1.1" : "2.1.3"

  await crearAsiento({
    fecha: gasto.fecha || new Date(),
    descripcion: `Gasto — ${gasto.descripcion}`,
    tipo: "gasto",
    referencia_tipo: "gasto",
    referencia_id: gasto.id,
    lineas: [
      { cuenta_codigo: cuentaCodigo, debe: monto, haber: 0 },
      { cuenta_codigo: contrapartida, debe: 0, haber: monto },
    ],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onGastoPagado(gasto: any) {
  const monto = Number(gasto.monto)
  if (monto <= 0) return

  // Pago de gasto pendiente: Gastos pendientes (debe) / Caja (haber)
  await crearAsiento({
    fecha: new Date(),
    descripcion: `Pago gasto — ${gasto.descripcion}`,
    tipo: "gasto",
    referencia_tipo: "gasto",
    referencia_id: gasto.id,
    lineas: [
      { cuenta_codigo: "2.1.3", debe: monto, haber: 0 },
      { cuenta_codigo: "1.1.1", debe: 0, haber: monto },
    ],
  })
}
