"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { CalificacionProveedor, RubroProveedor } from "@/types/database"

export async function getProveedores(busqueda?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("proveedores")
    .select("*, proveedores_productos(count), pagos(count)")
    .order("created_at", { ascending: false })

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,contacto_principal.ilike.%${busqueda}%,rubro.ilike.%${busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getProveedor(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("proveedores")
    .select(`
      *,
      proveedores_productos(
        id, descripcion, precio_referencia, moneda, ultima_compra, notas,
        producto:productos(id, nombre, sku)
      ),
      pagos(
        id, monto, metodo, concepto, fecha, notas
      ),
      compras(
        id, estado, fecha_pedido, fecha_esperada, fecha_recibida, notas, created_at,
        pedido:pedidos(id, numero_tn),
        items:items_compra(count)
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

export async function crearProveedor(data: {
  nombre: string
  contacto_principal?: string
  email?: string
  telefono?: string
  direccion?: string
  rubro: RubroProveedor
  condiciones_pago?: string
  tiempo_entrega_dias?: number
  calificacion?: CalificacionProveedor
  condicion_fiscal?: string
  cuit?: string
  notas?: string
}) {
  const supabase = await createClient()

  const { data: proveedor, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: data.nombre,
      contacto_principal: data.contacto_principal || null,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      rubro: data.rubro,
      condiciones_pago: data.condiciones_pago || null,
      tiempo_entrega_dias: data.tiempo_entrega_dias || null,
      calificacion: data.calificacion || "bueno",
      condicion_fiscal: data.condicion_fiscal || "responsable_inscripto",
      cuit: data.cuit || null,
      notas: data.notas || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/proveedores")
  return proveedor
}

export async function actualizarProveedor(
  id: string,
  data: {
    nombre?: string
    contacto_principal?: string
    email?: string
    telefono?: string
    direccion?: string
    rubro?: RubroProveedor
    condiciones_pago?: string
    tiempo_entrega_dias?: number | null
    calificacion?: CalificacionProveedor
    condicion_fiscal?: string
    cuit?: string | null
    notas?: string
    activo?: boolean
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("proveedores")
    .update(data)
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/proveedores")
  revalidatePath(`/proveedores/${id}`)
}

export async function agregarProductoProveedor(data: {
  proveedor_id: string
  producto_id?: string
  descripcion: string
  precio_referencia?: number
  moneda?: string
  notas?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("proveedores_productos")
    .insert({
      proveedor_id: data.proveedor_id,
      producto_id: data.producto_id || null,
      descripcion: data.descripcion,
      precio_referencia: data.precio_referencia || null,
      moneda: data.moneda || "ARS",
      notas: data.notas || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath(`/proveedores/${data.proveedor_id}`)
}

export async function eliminarProductoProveedor(id: string, proveedorId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("proveedores_productos")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath(`/proveedores/${proveedorId}`)
}
