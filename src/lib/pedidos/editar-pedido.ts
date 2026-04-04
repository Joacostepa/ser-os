"use server"

import { createClient } from "@/lib/supabase/server"
import { calcularNeto, calcularIVA } from "@/lib/iva"
import { revalidatePath } from "next/cache"

const ESTADOS_EDITABLES = [
  "nuevo",
  "pendiente_de_sena",
  "pendiente_sena",
  "habilitado",
  "en_prearmado",
  "bloqueado",
  "listo_para_armar",
  "en_armado",
]

interface ItemEdicion {
  producto_id?: string | null
  variante_id?: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
}

interface EdicionInput {
  pedidoId: string
  items: ItemEdicion[]
  descuento: number
  costoEnvio: number
  motivo: string
}

export async function guardarEdicionPedido(data: EdicionInput) {
  const supabase = await createClient()

  // 1. Get current pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id, monto_total, monto_neto, monto_pagado, saldo_pendiente, estado_interno, numero_tn, cantidad_ediciones")
    .eq("id", data.pedidoId)
    .single()

  if (pedidoError || !pedido) {
    throw new Error("Pedido no encontrado")
  }

  // 2. Validate estado is editable
  if (!ESTADOS_EDITABLES.includes(pedido.estado_interno)) {
    throw new Error(`No se puede editar un pedido en estado "${pedido.estado_interno}"`)
  }

  // Validate items > 0
  if (data.items.length === 0) {
    throw new Error("El pedido debe tener al menos un producto")
  }

  // Validate motivo
  if (!data.motivo || data.motivo.trim().length === 0) {
    throw new Error("Debe indicar un motivo para la edicion")
  }

  // Validate each item
  for (const item of data.items) {
    if (item.cantidad <= 0) throw new Error(`La cantidad de "${item.descripcion}" debe ser mayor a 0`)
    if (item.precio_unitario <= 0) throw new Error(`El precio de "${item.descripcion}" debe ser mayor a 0`)
  }

  // 3. Calculate new totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  )
  const newTotal = Math.round((subtotal - data.descuento + data.costoEnvio) * 100) / 100
  const newNeto = calcularNeto(newTotal)
  const newIva = calcularIVA(newTotal)

  // Check: if totalPagado > newTotal, throw
  const totalPagado = Number(pedido.monto_pagado || 0)
  if (totalPagado > newTotal + 0.01) {
    throw new Error(
      `El nuevo total ($${newTotal.toLocaleString("es-AR")}) es menor que lo ya cobrado ($${totalPagado.toLocaleString("es-AR")}). No se puede reducir el monto por debajo de lo pagado.`
    )
  }

  // 4. Delete existing items_pedido
  const { error: deleteError } = await supabase
    .from("items_pedido")
    .delete()
    .eq("pedido_id", data.pedidoId)

  if (deleteError) throw new Error("Error al eliminar items anteriores: " + deleteError.message)

  // 5. Insert new items with IVA calculation
  const newItems = data.items.map((item) => ({
    pedido_id: data.pedidoId,
    producto_id: item.producto_id || null,
    variante_id: item.variante_id || null,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    precio_neto: calcularNeto(item.precio_unitario),
    iva_unitario: calcularIVA(item.precio_unitario),
    costo_unitario: null,
    personalizacion: null,
  }))

  const { error: insertError } = await supabase
    .from("items_pedido")
    .insert(newItems)

  if (insertError) throw new Error("Error al insertar items nuevos: " + insertError.message)

  // 7. Update pedidos
  const cantidadEdiciones = Number(pedido.cantidad_ediciones || 0) + 1

  const { error: updateError } = await supabase
    .from("pedidos")
    .update({
      monto_total: newTotal,
      monto_neto: newNeto,
      monto_iva: newIva,
      descuento: data.descuento,
      costo_envio: data.costoEnvio,
      editado: true,
      fecha_ultima_edicion: new Date().toISOString(),
      cantidad_ediciones: cantidadEdiciones,
      saldo_pendiente: Math.max(0, Math.round((newTotal - totalPagado) * 100) / 100),
    })
    .eq("id", data.pedidoId)

  if (updateError) throw new Error("Error al actualizar pedido: " + updateError.message)

  // 8. Insert into pedido_ediciones
  const detalle = {
    items_count: data.items.length,
    items_summary: data.items.map((i) => `${i.cantidad}x ${i.descripcion} @$${i.precio_unitario}`),
    monto_anterior: Number(pedido.monto_total),
    monto_nuevo: newTotal,
    descuento: data.descuento,
    costo_envio: data.costoEnvio,
  }

  await supabase.from("pedido_ediciones").insert({
    pedido_id: data.pedidoId,
    motivo: data.motivo.trim(),
    tipo_cambio: "edicion_general",
    detalle: JSON.stringify(detalle),
  })

  // 9. Insert into historial_pedido
  const numeroPedido = pedido.numero_tn || pedido.id.slice(0, 8)
  await supabase.from("historial_pedido").insert({
    pedido_id: data.pedidoId,
    accion: `Pedido editado (edicion #${cantidadEdiciones}). Total: $${Number(pedido.monto_total).toLocaleString("es-AR")} → $${newTotal.toLocaleString("es-AR")}. Motivo: ${data.motivo.trim()}`,
    datos: detalle,
  })

  // 10. Update estado_pago based on new saldo
  const nuevoSaldo = newTotal - totalPagado
  // We don't have an estado_pago column directly, but we update saldo_pendiente
  // The UI derives estado_pago from saldo_pendiente and monto_pagado

  // 11. Try to adjust accounting entries (wrap in try/catch)
  try {
    // Find existing venta asiento and anulate it, then create new one
    const { data: asientoVenta } = await supabase
      .from("asientos")
      .select("id")
      .eq("referencia_tipo", "pedido")
      .eq("referencia_id", data.pedidoId)
      .eq("tipo", "venta")
      .eq("anulado", false)
      .limit(1)

    if (asientoVenta && asientoVenta.length > 0) {
      const { anularAsiento, crearAsiento } = await import("@/lib/contable/asientos")
      const { descomponerIVA } = await import("@/lib/iva")

      // Anulate old venta asiento
      await anularAsiento(asientoVenta[0].id)

      // Create new venta asiento with updated amounts
      const { neto, iva } = descomponerIVA(newTotal)
      await crearAsiento({
        fecha: new Date(),
        descripcion: `Venta pedido #${numeroPedido} (ajuste por edicion #${cantidadEdiciones})`,
        tipo: "venta",
        referencia_tipo: "pedido",
        referencia_id: data.pedidoId,
        lineas: [
          { cuenta_codigo: "1.1.2", debe: newTotal, haber: 0, descripcion: "Cuentas a Cobrar (ajustado)" },
          { cuenta_codigo: "4.1.1", debe: 0, haber: neto, descripcion: "Ventas (neto ajustado)" },
          { cuenta_codigo: "2.1.4", debe: 0, haber: iva, descripcion: "IVA Debito Fiscal (ajustado)" },
        ],
      })
    }
  } catch (err) {
    console.error("Error al ajustar asientos contables por edicion:", err)
  }

  // 12. Revalidate paths
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${data.pedidoId}`)
  revalidatePath("/operaciones")
  revalidatePath("/finanzas")
}
