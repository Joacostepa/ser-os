"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CanalBadge } from "@/components/shared/canal-badge"
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Plug,
  RefreshCw,
  Loader2,
  Store,
  Download,
} from "lucide-react"
import { addTienda } from "@/lib/actions/tiendas"
import { toast } from "sonner"

export default function IntegracionPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tiendas, setTiendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState("")
  const [canal, setCanal] = useState<"mayorista" | "minorista">("mayorista")
  const [storeId, setStoreId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    fetchTiendas()
  }, [])

  async function fetchTiendas() {
    setLoading(true)
    const { data } = await supabase
      .from("tiendas")
      .select("*")
      .eq("activa", true)
      .order("created_at")
    setTiendas(data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !storeId || !accessToken) {
      toast.error("Completá todos los campos requeridos")
      return
    }

    setSubmitting(true)
    try {
      await addTienda({
        nombre,
        canal,
        tienda_nube_store_id: storeId,
        access_token: accessToken,
        webhook_secret: webhookSecret || undefined,
      })
      toast.success("Tienda agregada")
      setDialogOpen(false)
      setNombre("")
      setStoreId("")
      setAccessToken("")
      setWebhookSecret("")
      fetchTiendas()
    } catch {
      toast.error("Error al agregar la tienda")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTestConnection(tiendaId: string, tnStoreId: string, token: string) {
    setTesting(tiendaId)
    try {
      const res = await fetch("/api/tienda-nube/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: tnStoreId, access_token: token }),
      })
      const data = await res.json()

      if (data.ok) {
        toast.success(`Conexión OK — ${data.store.name?.es || data.store.name} (${data.store.plan})`)
      } else {
        toast.error(`Error: ${data.error}`)
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setTesting(null)
    }
  }

  async function handleRegisterWebhooks(tiendaId: string) {
    setRegistering(tiendaId)
    try {
      const webhookUrl = `${window.location.origin}/api/webhooks/tienda-nube`
      const res = await fetch("/api/tienda-nube/webhooks/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tienda_id: tiendaId, webhook_url: webhookUrl }),
      })
      const data = await res.json()

      if (data.ok) {
        const ok = data.results.filter((r: { ok: boolean }) => r.ok).length
        toast.success(`${ok} webhooks registrados`)
      } else {
        toast.error(`Error: ${data.error}`)
      }
    } catch {
      toast.error("Error al registrar webhooks")
    } finally {
      setRegistering(null)
    }
  }

  async function handleSync(tiendaId: string, type: "products" | "customers" | "pedidos") {
    setSyncing(`${tiendaId}-${type}`)
    try {
      const res = await fetch("/api/tienda-nube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tienda_id: tiendaId, type }),
      })
      const data = await res.json()

      if (data.ok) {
        toast.success(`Importación de ${type} iniciada`)
      } else {
        toast.error(`Error: ${data.error}`)
      }
    } catch {
      toast.error("Error al iniciar importación")
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integración con Tienda Nube</h1>
          <p className="text-sm text-muted-foreground">
            Conectá las tiendas mayorista y minorista
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar tienda
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar tienda de Tienda Nube</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="SER Mayorista"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={canal} onValueChange={(v) => v && setCanal(v as typeof canal)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                      <SelectItem value="minorista">Minorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store ID de Tienda Nube</Label>
                <Input
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Token de acceso OAuth2"
                  type="password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret (opcional)</Label>
                <Input
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Para validar firmas HMAC"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Agregando..." : "Agregar tienda"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tiendas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay tiendas conectadas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Agregá una tienda para empezar a recibir pedidos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tiendas.map((tienda: any) => (
            <Card key={tienda.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Plug className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {tienda.nombre}
                        <CanalBadge canal={tienda.canal} />
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Store ID: {tienda.tienda_nube_store_id}
                        {tienda.ultima_sincronizacion && (
                          <> — Última sync: {new Date(tienda.ultima_sincronizacion).toLocaleDateString("es-AR")}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={tienda.activa ? "default" : "secondary"}>
                    {tienda.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(tienda.id, tienda.tienda_nube_store_id, tienda.access_token)}
                    disabled={testing === tienda.id}
                  >
                    {testing === tienda.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Test conexión
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegisterWebhooks(tienda.id)}
                    disabled={registering === tienda.id}
                  >
                    {registering === tienda.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Registrar webhooks
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(tienda.id, "products")}
                    disabled={syncing === `${tienda.id}-products`}
                  >
                    {syncing === `${tienda.id}-products` ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Importar productos
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(tienda.id, "customers")}
                    disabled={syncing === `${tienda.id}-customers`}
                  >
                    {syncing === `${tienda.id}-customers` ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Importar clientes
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(tienda.id, "pedidos")}
                    disabled={syncing === `${tienda.id}-pedidos`}
                  >
                    {syncing === `${tienda.id}-pedidos` ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Importar pedidos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Webhook URL info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL de Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Los webhooks se registran automáticamente con el botón &quot;Registrar webhooks&quot;.
            La URL utilizada es:
          </p>
          <code className="text-sm bg-muted px-3 py-2 rounded block">
            {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/tienda-nube` : "/api/webhooks/tienda-nube"}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Eventos: order/created, order/updated, order/paid, order/packed, order/fulfilled, order/cancelled, product/created, product/updated, product/deleted
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
