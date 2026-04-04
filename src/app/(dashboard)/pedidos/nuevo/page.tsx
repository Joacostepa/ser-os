"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { calcularNeto, calcularIVA } from "@/lib/iva"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  X,
  Trash2,
  Plus,
  Package,
  FileText,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  cuit: string | null
}

interface Variante {
  id: string
  nombre: string
  sku: string | null
  precio: number | null
}

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio_mayorista: number | null
  variantes: Variante[]
}

interface ItemForm {
  key: string
  producto_id: string | null
  variante_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  libre: boolean
}

type Canal = "whatsapp" | "telefono" | "presencial" | "otro"
type TipoPedido = "logo_ser" | "marca_blanca" | "personalizado"
type PrioridadPedido = "normal" | "alta" | "urgente"
type Despacho = "envio" | "retiro_oficina"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTrackingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function formatARS(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NuevoPedidoPage() {
  const router = useRouter()
  const supabase = createClient()

  // --- Client state ---
  const [clienteSearch, setClienteSearch] = useState("")
  const [clienteResults, setClienteResults] = useState<Cliente[]>([])
  const [searchingClientes, setSearchingClientes] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const clienteSearchRef = useRef<HTMLDivElement>(null)
  const clienteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- New client dialog ---
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cuit: "",
  })
  const [creatingClient, setCreatingClient] = useState(false)

  // --- Order details ---
  const [canal, setCanal] = useState<Canal | "">("")
  const [tipo, setTipo] = useState<TipoPedido | "">("")
  const [prioridad, setPrioridad] = useState<PrioridadPedido>("normal")
  const [fechaComprometida, setFechaComprometida] = useState("")
  const [observaciones, setObservaciones] = useState("")

  // --- Items ---
  const [items, setItems] = useState<ItemForm[]>([])
  const [descuento, setDescuento] = useState(0)

  // --- Product search dialog ---
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productQuery, setProductQuery] = useState("")
  const [productResults, setProductResults] = useState<Producto[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)

  // --- Shipping ---
  const [tipoDespacho, setTipoDespacho] = useState<Despacho>("envio")
  const [envio, setEnvio] = useState({
    direccion: "",
    localidad: "",
    provincia: "",
    cp: "",
  })
  const [costoEnvio, setCostoEnvio] = useState(0)

  // --- Submit ---
  const [submitting, setSubmitting] = useState(false)

  // ---------------------------------------------------------------------------
  // Client search with debounce
  // ---------------------------------------------------------------------------
  const searchClientes = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setClienteResults([])
        setShowClienteDropdown(false)
        return
      }
      setSearchingClientes(true)
      setShowClienteDropdown(true)
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, email, telefono, cuit")
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,telefono.ilike.%${query}%`)
        .order("nombre")
        .limit(10)
      setClienteResults(data || [])
      setSearchingClientes(false)
    },
    [supabase],
  )

  useEffect(() => {
    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current)
    if (clienteSearch.length >= 2) {
      clienteDebounceRef.current = setTimeout(() => {
        searchClientes(clienteSearch)
      }, 300)
    } else {
      setClienteResults([])
      setShowClienteDropdown(false)
    }
    return () => {
      if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current)
    }
  }, [clienteSearch, searchClientes])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ---------------------------------------------------------------------------
  // Create new client
  // ---------------------------------------------------------------------------
  async function handleCreateClient() {
    if (!newClientForm.nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setCreatingClient(true)
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nombre: newClientForm.nombre.trim(),
          email: newClientForm.email.trim() || null,
          telefono: newClientForm.telefono.trim() || null,
          cuit: newClientForm.cuit.trim() || null,
          categoria: "nuevo" as const,
        })
        .select("id, nombre, email, telefono, cuit")
        .single()

      if (error) throw error
      setSelectedCliente(data)
      setNewClientOpen(false)
      setNewClientForm({ nombre: "", email: "", telefono: "", cuit: "" })
      toast.success("Cliente creado")
    } catch {
      toast.error("Error al crear cliente")
    } finally {
      setCreatingClient(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Product search
  // ---------------------------------------------------------------------------
  async function searchProducts(query: string) {
    if (query.length < 2) {
      setProductResults([])
      return
    }
    setSearchingProducts(true)
    const { data } = await supabase
      .from("productos")
      .select("id, nombre, sku, precio_mayorista, variantes(id, nombre, sku, precio)")
      .eq("activo", true)
      .or(`nombre.ilike.%${query}%,sku.ilike.%${query}%`)
      .order("nombre")
      .limit(20)
    setProductResults((data as Producto[]) || [])
    setSearchingProducts(false)
  }

  function addProducto(producto: Producto, variante?: Variante) {
    const precio = variante?.precio || producto.precio_mayorista || 0
    const nombre = variante
      ? `${producto.nombre} — ${variante.nombre}`
      : producto.nombre

    setItems((prev) => [
      ...prev,
      {
        key: `prod-${Date.now()}-${Math.random()}`,
        producto_id: producto.id,
        variante_id: variante?.id || null,
        descripcion: nombre,
        cantidad: 1,
        precio_unitario: Number(precio),
        libre: false,
      },
    ])
    setProductSearchOpen(false)
    setProductQuery("")
    setProductResults([])
  }

  function addItemLibre() {
    setItems((prev) => [
      ...prev,
      {
        key: `libre-${Date.now()}-${Math.random()}`,
        producto_id: null,
        variante_id: null,
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
        libre: true,
      },
    ])
  }

  function updateItem(key: string, field: keyof ItemForm, value: string | number | boolean) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------
  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  const totalBeforeShipping = Math.max(subtotal - descuento, 0)
  const total = Math.round((totalBeforeShipping + costoEnvio) * 100) / 100
  const montoNeto = calcularNeto(total)
  const montoIva = calcularIVA(total)

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    // Validations
    if (!selectedCliente) {
      toast.error("Seleccioná un cliente")
      return
    }
    if (!canal) {
      toast.error("Seleccioná un canal")
      return
    }
    if (!tipo) {
      toast.error("Seleccioná un tipo de pedido")
      return
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un item")
      return
    }
    for (const item of items) {
      if (!item.descripcion.trim()) {
        toast.error("Todos los items deben tener descripción")
        return
      }
      if (item.cantidad <= 0) {
        toast.error(`La cantidad de "${item.descripcion}" debe ser mayor a 0`)
        return
      }
      if (item.precio_unitario <= 0) {
        toast.error(`El precio de "${item.descripcion}" debe ser mayor a 0`)
        return
      }
    }
    if (total <= 0) {
      toast.error("El total debe ser mayor a 0")
      return
    }
    if (tipoDespacho === "envio" && !envio.direccion.trim()) {
      toast.error("La dirección de envío es requerida")
      return
    }

    setSubmitting(true)
    try {
      // 1. Generate numero_interno
      const { data: maxPedido } = await supabase
        .from("pedidos")
        .select("numero_interno")
        .not("numero_interno", "is", null)
        .like("numero_interno", "INT-%")
        .order("numero_interno", { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1
      if (maxPedido?.numero_interno) {
        const match = maxPedido.numero_interno.match(/INT-(\d+)/)
        if (match) nextNum = parseInt(match[1], 10) + 1
      }
      const numeroInterno = `INT-${String(nextNum).padStart(3, "0")}`

      // 2. Generate codigo_seguimiento_portal
      const codigoSeguimientoPortal = generateTrackingCode()

      // 3. Build datos_envio
      const datosEnvio =
        tipoDespacho === "envio"
          ? {
              direccion: envio.direccion,
              localidad: envio.localidad,
              provincia: envio.provincia,
              codigo_postal: envio.cp,
            }
          : null

      // 4. Build canal label for history
      const canalLabels: Record<Canal, string> = {
        whatsapp: "WhatsApp",
        telefono: "Teléfono",
        presencial: "Presencial",
        otro: "Otro",
      }

      // 5. INSERT pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: selectedCliente.id,
          canal: canal as string,
          numero_interno: numeroInterno,
          tipo,
          estado_interno: "nuevo" as const,
          estado_publico: "recibido" as const,
          prioridad,
          monto_total: total,
          monto_neto: montoNeto,
          monto_iva: montoIva,
          monto_pagado: 0,
          descuento,
          costo_envio: costoEnvio,
          tipo_despacho: tipoDespacho,
          datos_envio: datosEnvio,
          fecha_comprometida: fechaComprometida || null,
          observaciones: observaciones || null,
          fecha_ingreso: new Date().toISOString(),
          codigo_seguimiento_portal: codigoSeguimientoPortal,
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError

      // 6. INSERT items_pedido
      const itemRows = items.map((item) => ({
        pedido_id: pedido.id,
        producto_id: item.producto_id,
        variante_id: item.variante_id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_neto: calcularNeto(item.precio_unitario),
        iva_unitario: calcularIVA(item.precio_unitario),
        costo_unitario: null,
        personalizacion: null,
      }))

      const { error: itemsError } = await supabase
        .from("items_pedido")
        .insert(itemRows)

      if (itemsError) throw itemsError

      // 7. INSERT pedido_snapshot_tn
      const snapshotItems = items.map((item) => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        producto_id: item.producto_id,
        variante_id: item.variante_id,
      }))

      await supabase.from("pedido_snapshot_tn").insert({
        pedido_id: pedido.id,
        items: JSON.stringify(snapshotItems),
        monto_total: total,
        monto_neto: montoNeto,
      })

      // 8. INSERT historial_pedido
      await supabase.from("historial_pedido").insert({
        pedido_id: pedido.id,
        accion: `Pedido creado manualmente — Canal: ${canalLabels[canal as Canal]}`,
        estado_nuevo: "nuevo",
      })

      toast.success("Pedido creado correctamente")
      router.push(`/pedidos/${pedido.id}`)
    } catch (err) {
      console.error(err)
      toast.error("Error al crear el pedido")
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-[800px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/pedidos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-medium text-stone-800">Nuevo pedido</h1>
          <p className="text-sm text-stone-400">Pedido manual (WhatsApp, teléfono, presencial)</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Section 1: Cliente */}
      {/* ============================================================== */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Cliente</h2>
        </div>
        <div className="p-4 space-y-3">
          {!selectedCliente ? (
            <>
              <div ref={clienteSearchRef} className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  onFocus={() => {
                    if (clienteResults.length > 0) setShowClienteDropdown(true)
                  }}
                  className="pl-8"
                />
                {showClienteDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg max-h-[240px] overflow-y-auto">
                    {searchingClientes && (
                      <p className="text-xs text-stone-400 text-center py-4">Buscando...</p>
                    )}
                    {!searchingClientes && clienteResults.length === 0 && clienteSearch.length >= 2 && (
                      <p className="text-xs text-stone-400 text-center py-4">
                        No se encontraron clientes
                      </p>
                    )}
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0"
                        onClick={() => {
                          setSelectedCliente(c)
                          setShowClienteDropdown(false)
                          setClienteSearch("")
                        }}
                      >
                        <p className="text-sm font-medium text-stone-800">{c.nombre}</p>
                        <p className="text-xs text-stone-400">
                          {c.email && <span>{c.email}</span>}
                          {c.email && c.telefono && <span> · </span>}
                          {c.telefono && <span>{c.telefono}</span>}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2"
                onClick={() => setNewClientOpen(true)}
              >
                ¿Cliente nuevo? Crear cliente
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: "#3d4a3e" }}
              >
                {initials(selectedCliente.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">
                  {selectedCliente.nombre}
                </p>
                <p className="text-xs text-stone-400 truncate">
                  {selectedCliente.email && <span>{selectedCliente.email}</span>}
                  {selectedCliente.email && selectedCliente.telefono && <span> · </span>}
                  {selectedCliente.telefono && <span>{selectedCliente.telefono}</span>}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedCliente(null)}
              >
                <X className="h-3.5 w-3.5 text-stone-400" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New client dialog */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre completo o empresa"
                value={newClientForm.nombre}
                onChange={(e) =>
                  setNewClientForm((p) => ({ ...p, nombre: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={newClientForm.email}
                onChange={(e) =>
                  setNewClientForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                placeholder="+54 11 ..."
                value={newClientForm.telefono}
                onChange={(e) =>
                  setNewClientForm((p) => ({ ...p, telefono: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>CUIT</Label>
              <Input
                placeholder="XX-XXXXXXXX-X"
                value={newClientForm.cuit}
                onChange={(e) =>
                  setNewClientForm((p) => ({ ...p, cuit: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewClientOpen(false)}
              disabled={creatingClient}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateClient} disabled={creatingClient}>
              {creatingClient ? "Creando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* Section 2: Detalles del pedido */}
      {/* ============================================================== */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Detalles del pedido</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Canal *</Label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as Canal | "")}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Seleccionar...</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telefono">Teléfono</option>
                <option value="presencial">Presencial</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPedido | "")}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Seleccionar...</option>
                <option value="logo_ser">Logo SER</option>
                <option value="marca_blanca">Marca blanca</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as PrioridadPedido)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha comprometida</Label>
            <Input
              type="date"
              value={fechaComprometida}
              onChange={(e) => setFechaComprometida(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales del pedido..."
              className="min-h-[80px]"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Section 3: Items */}
      {/* ============================================================== */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-700">Items</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductSearchOpen(true)}
            >
              <Package className="h-3.5 w-3.5 mr-1.5" data-icon="inline-start" />
              Agregar item
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItemLibre}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" data-icon="inline-start" />
              Item libre
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-stone-400">
              Todavía no hay items. Usá &quot;Agregar item&quot; para buscar en el catálogo
              o &quot;Item libre&quot; para agregar uno manual.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_70px_100px_90px_32px] gap-2 px-4 py-2 text-xs text-stone-400">
              <span>Descripción</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">Precio unit.</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>

            {items.map((item) => {
              const itemSubtotal = item.cantidad * item.precio_unitario
              return (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_70px_100px_90px_32px] gap-2 px-4 py-2 items-center"
                >
                  {item.libre ? (
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateItem(item.key, "descripcion", e.target.value)}
                      placeholder="Descripción del item"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm text-stone-800 truncate px-1">
                      {item.descripcion || "Producto"}
                    </span>
                  )}
                  <Input
                    type="number"
                    value={item.cantidad || ""}
                    onChange={(e) =>
                      updateItem(item.key, "cantidad", parseInt(e.target.value) || 0)
                    }
                    min={1}
                    className="h-8 text-sm font-mono text-right"
                  />
                  <Input
                    type="number"
                    value={item.precio_unitario || ""}
                    onChange={(e) =>
                      updateItem(item.key, "precio_unitario", parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step={0.01}
                    className="h-8 text-sm font-mono text-right"
                  />
                  <span className="text-sm font-mono text-right text-stone-600">
                    ${formatARS(itemSubtotal)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-stone-400 hover:text-red-500"
                    onClick={() => removeItem(item.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Totals footer */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Subtotal</span>
              <span className="text-sm font-mono text-stone-700">${formatARS(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Descuento</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-400">-$</span>
                <Input
                  type="number"
                  value={descuento || ""}
                  onChange={(e) => setDescuento(Number(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  className="h-7 w-24 text-sm font-mono text-right"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Costo envío</span>
              <span className="text-sm font-mono text-stone-600">
                {costoEnvio > 0 ? `+$${formatARS(costoEnvio)}` : "$0,00"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-sm font-medium text-stone-800">TOTAL</span>
              <span className="text-base font-medium font-mono text-stone-900">
                ${formatARS(total)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">Neto sin IVA</span>
              <span className="font-mono text-stone-500">${formatARS(montoNeto)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">IVA 21%</span>
              <span className="font-mono text-stone-500">${formatARS(montoIva)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Product search dialog */}
      <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buscar producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value)
                  searchProducts(e.target.value)
                }}
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {searchingProducts && (
                <p className="text-xs text-stone-400 text-center py-4">Buscando...</p>
              )}
              {!searchingProducts && productQuery.length >= 2 && productResults.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">
                  No se encontraron productos
                </p>
              )}
              {productResults.map((prod) => (
                <div key={prod.id}>
                  {!prod.variantes || prod.variantes.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addProducto(prod)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-stone-800">{prod.nombre}</p>
                      <p className="text-xs text-stone-400">
                        {prod.sku && <span className="font-mono">{prod.sku} · </span>}
                        {prod.precio_mayorista
                          ? `$${Number(prod.precio_mayorista).toLocaleString("es-AR")}`
                          : "Sin precio"}
                      </p>
                    </button>
                  ) : (
                    <div>
                      <p className="text-xs text-stone-400 px-3 pt-2 font-medium">{prod.nombre}</p>
                      {prod.variantes.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => addProducto(prod, v)}
                          className="w-full text-left px-3 py-1.5 pl-6 rounded-lg hover:bg-stone-50 transition-colors"
                        >
                          <p className="text-sm text-stone-700">{v.nombre}</p>
                          <p className="text-xs text-stone-400">
                            {v.sku && <span className="font-mono">{v.sku} · </span>}
                            {v.precio
                              ? `$${Number(v.precio).toLocaleString("es-AR")}`
                              : prod.precio_mayorista
                                ? `$${Number(prod.precio_mayorista).toLocaleString("es-AR")}`
                                : "Sin precio"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* Section 4: Envío */}
      {/* ============================================================== */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Envío</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="despacho"
                value="envio"
                checked={tipoDespacho === "envio"}
                onChange={() => setTipoDespacho("envio")}
                className="accent-stone-700"
              />
              <span className="text-sm text-stone-700">Envío</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="despacho"
                value="retiro_oficina"
                checked={tipoDespacho === "retiro_oficina"}
                onChange={() => setTipoDespacho("retiro_oficina")}
                className="accent-stone-700"
              />
              <span className="text-sm text-stone-700">Retiro en oficina</span>
            </label>
          </div>

          {tipoDespacho === "envio" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Dirección *</Label>
                <Input
                  placeholder="Calle y número"
                  value={envio.direccion}
                  onChange={(e) => setEnvio((p) => ({ ...p, direccion: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Localidad</Label>
                  <Input
                    placeholder="Localidad"
                    value={envio.localidad}
                    onChange={(e) => setEnvio((p) => ({ ...p, localidad: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Provincia</Label>
                  <Input
                    placeholder="Provincia"
                    value={envio.provincia}
                    onChange={(e) => setEnvio((p) => ({ ...p, provincia: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CP</Label>
                  <Input
                    placeholder="Código postal"
                    value={envio.cp}
                    onChange={(e) => setEnvio((p) => ({ ...p, cp: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Costo de envío</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-stone-400">$</span>
                  <Input
                    type="number"
                    value={costoEnvio || ""}
                    onChange={(e) => setCostoEnvio(Number(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className="h-8 w-32 font-mono text-right"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3">
              <p className="text-sm text-stone-600">
                El cliente retira en la oficina de SER.
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Se coordinará horario de retiro por el canal seleccionado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* Actions bar */}
      {/* ============================================================== */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/pedidos">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creando..." : "Crear pedido"}
        </Button>
      </div>
    </div>
  )
}
