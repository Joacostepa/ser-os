import { createClient } from "@/lib/supabase/server"
import { formatearMonto } from "@/lib/formatters"
import { ESTADOS_INTERNOS, UNIDAD_INSUMO_CONFIG } from "@/lib/constants"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ resultados: {} })

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("auth_id", user.id)
    .single()
  const rol = usuario?.rol || "lectura"

  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim()
  if (!q || q.length < 2) return Response.json({ resultados: {} })

  const esNumero = /^\d+$/.test(q.replace("#", "").replace("$", ""))
  const esPedido = q.startsWith("#") || q.startsWith("INT-")

  const [pedidos, clientes, productos, proveedores, insumos, compras] =
    await Promise.all([
      buscarPedidos(supabase, q, esNumero, esPedido),
      esPedido ? [] : buscarClientes(supabase, q),
      esPedido ? [] : buscarProductos(supabase, q),
      esPedido ? [] : buscarProveedores(supabase, q),
      esPedido ? [] : buscarInsumos(supabase, q),
      buscarCompras(supabase, q),
    ])

  const visiblePorRol: Record<string, string[]> = {
    admin: [
      "pedidos",
      "clientes",
      "productos",
      "proveedores",
      "insumos",
      "compras",
    ],
    operaciones: [
      "pedidos",
      "clientes",
      "productos",
      "proveedores",
      "insumos",
      "compras",
    ],
    diseno: ["productos"],
    armado: [],
    contable: ["pedidos", "clientes", "proveedores", "compras"],
    logistica: ["pedidos", "clientes"],
    lectura: [
      "pedidos",
      "clientes",
      "productos",
      "proveedores",
      "insumos",
      "compras",
    ],
  }
  const permitidos = visiblePorRol[rol] || []
  const resultados: Record<string, unknown[]> = {}
  const all: Record<string, unknown[]> = {
    pedidos,
    clientes,
    productos,
    proveedores,
    insumos,
    compras,
  }
  for (const [tipo, items] of Object.entries(all)) {
    if (permitidos.includes(tipo) && items.length > 0) resultados[tipo] = items
  }

  return Response.json({ resultados })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarPedidos(supabase: any, q: string, esNumero: boolean, esPedido: boolean) {
  try {
    const qLimpio = q.replace("#", "").replace("INT-", "")

    let query = supabase
      .from("pedidos")
      .select("id, numero_tn, numero_interno, estado_interno, monto_total, cliente:clientes(nombre)")
      .limit(5)

    if (esNumero || esPedido) {
      query = query.or(
        `numero_tn.ilike.%${qLimpio}%,numero_interno.ilike.%${qLimpio}%`
      )
    } else {
      query = query.or(
        `numero_tn.ilike.%${q}%,numero_interno.ilike.%${q}%`
      )
    }

    const { data, error } = await query
    if (error || !data) return []

    // If text search and no results from numero, try by client name
    if (!esNumero && !esPedido && data.length === 0) {
      const { data: porCliente } = await supabase
        .from("pedidos")
        .select("id, numero_tn, numero_interno, estado_interno, monto_total, cliente:clientes!inner(nombre)")
        .ilike("clientes.nombre", `%${q}%`)
        .limit(5)
      if (porCliente) return porCliente.map(mapPedido)
    }

    return data.map(mapPedido)
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPedido(p: any) {
  const numero = p.numero_interno || p.numero_tn || "s/n"
  const clienteNombre = p.cliente?.nombre || "Sin cliente"
  const estado = ESTADOS_INTERNOS[p.estado_interno]?.label || p.estado_interno
  return {
    tipo: "pedidos",
    id: p.id,
    titulo: `#${numero}`,
    subtitulo: `${clienteNombre} — ${formatearMonto(p.monto_total || 0)} — ${estado}`,
    url: `/pedidos/${p.id}`,
    icono: "Package",
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarClientes(supabase: any, q: string) {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, email, telefono")
      .or(`nombre.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(5)
    if (error || !data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((c: any) => ({
      tipo: "clientes",
      id: c.id,
      titulo: c.nombre,
      subtitulo: [c.email, c.telefono].filter(Boolean).join(" · "),
      url: `/clientes/${c.id}`,
      icono: "User",
    }))
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarProductos(supabase: any, q: string) {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, sku, precio_mayorista")
      .or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(5)
    if (error || !data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => ({
      tipo: "productos",
      id: p.id,
      titulo: p.nombre,
      subtitulo: [p.sku, p.precio_mayorista ? formatearMonto(p.precio_mayorista) : null]
        .filter(Boolean)
        .join(" · "),
      url: `/productos/${p.id}`,
      icono: "ShoppingBag",
    }))
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarProveedores(supabase: any, q: string) {
  try {
    const { data, error } = await supabase
      .from("proveedores")
      .select("id, nombre, contacto_principal, telefono")
      .or(`nombre.ilike.%${q}%,contacto_principal.ilike.%${q}%`)
      .eq("activo", true)
      .limit(3)
    if (error || !data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => ({
      tipo: "proveedores",
      id: p.id,
      titulo: p.nombre,
      subtitulo: [p.contacto_principal, p.telefono].filter(Boolean).join(" · "),
      url: `/proveedores/${p.id}`,
      icono: "Building",
    }))
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarInsumos(supabase: any, q: string) {
  try {
    const { data, error } = await supabase
      .from("insumos")
      .select("id, nombre, stock_actual, unidad")
      .ilike("nombre", `%${q}%`)
      .limit(3)
    if (error || !data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((i: any) => {
      const unidadLabel =
        UNIDAD_INSUMO_CONFIG[i.unidad as keyof typeof UNIDAD_INSUMO_CONFIG]?.short || i.unidad
      return {
        tipo: "insumos",
        id: i.id,
        titulo: i.nombre,
        subtitulo: `Stock: ${i.stock_actual} ${unidadLabel}`,
        url: `/insumos/${i.id}`,
        icono: "Layers",
      }
    })
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarCompras(supabase: any, q: string) {
  try {
    const { data, error } = await supabase
      .from("compras")
      .select("id, numero_orden, subtotal, proveedor:proveedores(nombre)")
      .ilike("numero_orden", `%${q}%`)
      .limit(3)
    if (error || !data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((c: any) => ({
      tipo: "compras",
      id: c.id,
      titulo: `OC-${c.numero_orden}`,
      subtitulo: `${c.proveedor?.nombre || "Sin proveedor"} — ${formatearMonto(c.subtotal || 0)}`,
      url: `/compras/${c.id}`,
      icono: "FileText",
    }))
  } catch {
    return []
  }
}
