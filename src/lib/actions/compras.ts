"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EstadoCompra } from "@/types/database"
import { getCotizacionVenta } from "@/lib/dolar-api"
import { onCompraRecibida, onPagoProveedorRegistrado } from "@/lib/contable/hooks-contables"

// ---------------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------------
export async function getComprasListado(filtros?: {
  busqueda?: string
  estado?: EstadoCompra
  proveedor_id?: string
  estado_pago?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("compras")
    .select(`
      *,
      proveedor:proveedores(id, nombre),
      pedido:pedidos(id, numero_tn),
      items:items_compra(count)
    `)
    .order("created_at", { ascending: false })

  if (filtros?.estado) {
    query = query.eq("estado", filtros.estado)
  }
  if (filtros?.proveedor_id) {
    query = query.eq("proveedor_id", filtros.proveedor_id)
  }
  if (filtros?.estado_pago) {
    query = query.eq("estado_pago", filtros.estado_pago)
  }
  if (filtros?.busqueda) {
    query = query.or(
      `numero_orden.ilike.%${filtros.busqueda}%,notas.ilike.%${filtros.busqueda}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------------------------------------------------------------------
// METRICS
// ---------------------------------------------------------------------------
export async function getCompraMetrics() {
  const supabase = await createClient()

  const { data: compras, error } = await supabase
    .from("compras")
    .select("id, estado, estado_pago, subtotal, descuento")

  if (error) throw new Error(error.message)

  const lista = compras ?? []

  const totalCompras = lista.length
  const montoComprado = lista.reduce(
    (s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)),
    0
  )

  const pendientesRecibir = lista.filter(
    (c) => !["recibida", "cancelada"].includes(c.estado)
  )
  const pendienteRecibirCount = pendientesRecibir.length
  const pendienteRecibirMonto = pendientesRecibir.reduce(
    (s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)),
    0
  )

  const pendientePagar = lista
    .filter((c) => c.estado_pago !== "pagada" && c.estado !== "cancelada")
    .reduce((s, c) => s + (Number(c.subtotal) - Number(c.descuento ?? 0)), 0)

  return {
    totalCompras,
    montoComprado,
    pendienteRecibirCount,
    pendienteRecibirMonto,
    pendientePagar,
  }
}

// ---------------------------------------------------------------------------
// DETAIL
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCompraDetalle(id: string): Promise<any> {
  const supabase = await createClient()

  const { data: compra, error } = await supabase
    .from("compras")
    .select(`
      *,
      proveedor:proveedores(id, nombre, telefono, email, rubro),
      pedido:pedidos(id, numero_tn, estado_interno, cliente:clientes(nombre)),
      items:items_compra(
        *,
        producto:productos(id, nombre, sku),
        variante:variantes(id, nombre, sku),
        insumo:insumos(id, nombre, unidad, rendimiento)
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)

  // Fetch recepciones
  const { data: recepciones } = await supabase
    .from("recepciones")
    .select(`
      *,
      items:items_recepcion(
        *,
        item_compra:items_compra(id, descripcion)
      )
    `)
    .eq("compra_id", id)
    .order("created_at", { ascending: false })

  // Fetch pagos
  const { data: pagos } = await supabase
    .from("pagos_proveedor")
    .select("*")
    .eq("compra_id", id)
    .order("created_at", { ascending: false })

  // Fetch historial de precios
  const { data: historial } = await supabase
    .from("historial_precios")
    .select("*")
    .eq("compra_id", id)
    .order("created_at", { ascending: false })

  return {
    ...compra,
    recepciones: recepciones ?? [],
    pagos: pagos ?? [],
    historial: historial ?? [],
  }
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
export async function crearOrdenCompra(data: {
  proveedor_id: string
  pedido_id?: string
  fecha_entrega_esperada?: string
  condicion_pago?: string
  items: {
    producto_id?: string
    variante_id?: string
    insumo_id?: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    notas?: string
  }[]
  notas?: string
  notas_internas?: string
  estado: "borrador" | "enviada"
}) {
  const supabase = await createClient()

  // Generate OC number
  const { data: numero, error: rpcError } = await supabase.rpc("generar_numero_oc")
  if (rpcError) throw new Error(rpcError.message)

  // Snapshot cotización USD
  const cotizacionUsd = await getCotizacionVenta("blue")

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, i) => sum + i.cantidad * i.precio_unitario,
    0
  )
  const montoTotalUsd = cotizacionUsd
    ? Math.round((subtotal / cotizacionUsd) * 100) / 100
    : null

  const fechaEnvio =
    data.estado === "enviada"
      ? new Date().toISOString().split("T")[0]
      : null

  // Create compra
  const { data: compra, error: compraError } = await supabase
    .from("compras")
    .insert({
      numero_orden: numero as string,
      proveedor_id: data.proveedor_id,
      pedido_id: data.pedido_id || null,
      estado: data.estado,
      estado_pago: "pendiente",
      fecha_pedido: new Date().toISOString().split("T")[0],
      fecha_envio: fechaEnvio,
      fecha_esperada: data.fecha_entrega_esperada || null,
      condicion_pago: data.condicion_pago || null,
      subtotal,
      descuento: 0,
      notas: data.notas || null,
      notas_internas: data.notas_internas || null,
      cotizacion_usd: cotizacionUsd,
      cotizacion_tipo: "blue",
      monto_total_usd: montoTotalUsd,
    })
    .select()
    .single()

  if (compraError) throw new Error(compraError.message)

  // Create items
  if (data.items.length > 0) {
    const items = data.items.map((item) => ({
      compra_id: compra.id,
      producto_id: item.producto_id || null,
      variante_id: item.variante_id || null,
      insumo_id: item.insumo_id || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      cantidad_recibida: 0,
      notas: item.notas || null,
    }))

    const { error: itemsError } = await supabase
      .from("items_compra")
      .insert(items)

    if (itemsError) throw new Error(itemsError.message)
  }

  // Register historial_precios
  const preciosHistorial = data.items
    .filter((i) => i.precio_unitario > 0)
    .map((item) => ({
      proveedor_id: data.proveedor_id,
      producto_id: item.producto_id || null,
      variante_id: item.variante_id || null,
      descripcion: item.descripcion,
      precio_unitario: item.precio_unitario,
      fecha: new Date().toISOString().split("T")[0],
      compra_id: compra.id,
    }))

  if (preciosHistorial.length > 0) {
    await supabase.from("historial_precios").insert(preciosHistorial)
  }

  revalidatePath("/compras")
  return compra
}

// ---------------------------------------------------------------------------
// UPDATE ESTADO
// ---------------------------------------------------------------------------
export async function actualizarEstadoCompra(id: string, estado: EstadoCompra) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado }
  const today = new Date().toISOString().split("T")[0]

  if (estado === "enviada") {
    updateData.fecha_envio = today
  }
  if (estado === "confirmada") {
    updateData.fecha_confirmacion = today
  }
  if (estado === "recibida") {
    updateData.fecha_recibida = today
  }

  const { error } = await supabase
    .from("compras")
    .update(updateData)
    .eq("id", id)

  if (error) throw new Error(error.message)

  // If fully received, mark all items as received + generate stock entries + contable hook
  if (estado === "recibida") {
    const { data: items } = await supabase
      .from("items_compra")
      .select("id, cantidad, insumo_id, insumo:insumos(rendimiento)")
      .eq("compra_id", id)

    if (items) {
      for (const item of items) {
        await supabase
          .from("items_compra")
          .update({ cantidad_recibida: item.cantidad })
          .eq("id", item.id)

        if (item.insumo_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rendimiento = Number((item as any).insumo?.rendimiento || 1)
          const cantidadStock = item.cantidad * rendimiento

          await supabase.rpc("registrar_movimiento_stock", {
            p_insumo_id: item.insumo_id,
            p_tipo: "entrada",
            p_cantidad: cantidadStock,
            p_referencia_tipo: "compra",
            p_referencia_id: id,
            p_notas: `Recepcion de compra (${item.cantidad} x ${rendimiento} = ${cantidadStock})`,
            p_usuario_id: null,
          })
        }
      }
    }

    // Contable hook
    const compra = await getCompraDetalle(id)
    await onCompraRecibida(compra)
  }

  revalidatePath("/compras")
  revalidatePath(`/compras/${id}`)
}

// ---------------------------------------------------------------------------
// RECEPCIONES
// ---------------------------------------------------------------------------
export async function registrarRecepcion(data: {
  compra_id: string
  items: {
    item_compra_id: string
    cantidad_recibida: number
    estado_calidad: string
    notas?: string
  }[]
  notas?: string
  es_final?: boolean
}) {
  const supabase = await createClient()

  // Create recepcion
  const { data: recepcion, error: recError } = await supabase
    .from("recepciones")
    .insert({
      compra_id: data.compra_id,
      fecha: new Date().toISOString().split("T")[0],
      usuario_id: null,
      notas: data.notas || null,
    })
    .select()
    .single()

  if (recError) throw new Error(recError.message)

  // Create items_recepcion
  const itemsRecepcion = data.items
    .filter((i) => i.cantidad_recibida > 0)
    .map((item) => ({
      recepcion_id: recepcion.id,
      item_compra_id: item.item_compra_id,
      cantidad_recibida: item.cantidad_recibida,
      estado_calidad: item.estado_calidad,
      notas: item.notas || null,
    }))

  if (itemsRecepcion.length > 0) {
    const { error: irError } = await supabase
      .from("items_recepcion")
      .insert(itemsRecepcion)

    if (irError) throw new Error(irError.message)
  }

  // Update items_compra.cantidad_recibida
  for (const item of data.items.filter((i) => i.cantidad_recibida > 0)) {
    const { data: current } = await supabase
      .from("items_compra")
      .select("cantidad_recibida, cantidad, insumo_id, insumo:insumos(rendimiento)")
      .eq("id", item.item_compra_id)
      .single()

    if (current) {
      const nuevaCantidad =
        Number(current.cantidad_recibida) + item.cantidad_recibida

      await supabase
        .from("items_compra")
        .update({ cantidad_recibida: nuevaCantidad })
        .eq("id", item.item_compra_id)

      // Update insumo stock if linked
      if (current.insumo_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rendimiento = Number((current as any).insumo?.rendimiento || 1)
        const cantidadStock = item.cantidad_recibida * rendimiento

        await supabase.rpc("registrar_movimiento_stock", {
          p_insumo_id: current.insumo_id,
          p_tipo: "entrada",
          p_cantidad: cantidadStock,
          p_referencia_tipo: "compra",
          p_referencia_id: data.compra_id,
          p_notas: `Recepcion parcial (${item.cantidad_recibida} x ${rendimiento} = ${cantidadStock})`,
          p_usuario_id: null,
        })
      }
    }
  }

  // Check if all items fully received → update compra estado
  const { data: allItems } = await supabase
    .from("items_compra")
    .select("cantidad, cantidad_recibida")
    .eq("compra_id", data.compra_id)

  if (allItems) {
    const allReceived = allItems.every(
      (i) => Number(i.cantidad_recibida) >= Number(i.cantidad)
    )
    const someReceived = allItems.some((i) => Number(i.cantidad_recibida) > 0)

    if (allReceived || data.es_final) {
      await supabase
        .from("compras")
        .update({
          estado: "recibida" as EstadoCompra,
          fecha_recibida: new Date().toISOString().split("T")[0],
        })
        .eq("id", data.compra_id)

      // Contable hook
      const compra = await getCompraDetalle(data.compra_id)
      await onCompraRecibida(compra)
    } else if (someReceived) {
      await supabase
        .from("compras")
        .update({ estado: "recibida_parcial" as EstadoCompra })
        .eq("id", data.compra_id)
    }
  }

  revalidatePath("/compras")
  revalidatePath(`/compras/${data.compra_id}`)
  return recepcion
}

export async function getRecepcionesCompra(compraId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recepciones")
    .select(`
      *,
      items:items_recepcion(
        *,
        item_compra:items_compra(id, descripcion, cantidad)
      )
    `)
    .eq("compra_id", compraId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------------------------------------------------------------------
// PAGOS
// ---------------------------------------------------------------------------
export async function registrarPagoProveedor(data: {
  compra_id: string
  proveedor_id: string
  proveedor_nombre?: string
  monto: number
  metodo_pago: string
  fecha: string
  observaciones?: string
}) {
  const supabase = await createClient()

  const { data: pago, error } = await supabase
    .from("pagos_proveedor")
    .insert({
      compra_id: data.compra_id,
      proveedor_id: data.proveedor_id,
      monto: data.monto,
      metodo_pago: data.metodo_pago,
      fecha: data.fecha,
      observaciones: data.observaciones || null,
      comprobante_url: null,
      asiento_id: null,
      usuario_id: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Recalculate estado_pago
  const { data: allPagos } = await supabase
    .from("pagos_proveedor")
    .select("monto")
    .eq("compra_id", data.compra_id)

  const { data: compra } = await supabase
    .from("compras")
    .select("subtotal, descuento")
    .eq("id", data.compra_id)
    .single()

  if (allPagos && compra) {
    const totalPagado = allPagos.reduce((s, p) => s + Number(p.monto), 0)
    const totalCompra = Number(compra.subtotal) - Number(compra.descuento ?? 0)

    let estadoPago = "pendiente"
    if (totalPagado >= totalCompra) {
      estadoPago = "pagada"
    } else if (totalPagado > 0) {
      estadoPago = "parcial"
    }

    await supabase
      .from("compras")
      .update({ estado_pago: estadoPago })
      .eq("id", data.compra_id)
  }

  // Contable hook
  await onPagoProveedorRegistrado({
    ...pago,
    proveedor_nombre: data.proveedor_nombre ?? "",
    metodo: data.metodo_pago,
  })

  revalidatePath("/compras")
  revalidatePath(`/compras/${data.compra_id}`)
  return pago
}

export async function getPagosCompra(compraId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pagos_proveedor")
    .select("*")
    .eq("compra_id", compraId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const pagos = data ?? []
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)

  return { pagos, totalPagado }
}

// ---------------------------------------------------------------------------
// SUGERENCIAS REPOSICION
// ---------------------------------------------------------------------------
export async function getSugerenciasReposicion() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("insumos")
    .select(`
      id,
      nombre,
      stock_actual,
      stock_minimo,
      costo_unitario,
      unidad,
      proveedor_id,
      proveedor:proveedores(id, nombre)
    `)
    .eq("activo", true)
    .order("nombre")

  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter((i) => Number(i.stock_actual) < Number(i.stock_minimo))
    .map((i) => ({
      ...i,
      cantidad_sugerida: Math.max(
        0,
        Number(i.stock_minimo) * 2 - Number(i.stock_actual)
      ),
    }))
}
