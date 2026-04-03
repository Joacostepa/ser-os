import { createClient } from "@supabase/supabase-js"
import { TiendaNubeClient } from "./client"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TiendaRecord {
  id: string
  nombre: string
  canal: "mayorista" | "minorista"
  tienda_nube_store_id: string
  access_token: string
  webhook_secret: string | null
  activa: boolean
}

/**
 * Create a TN client for a given tienda UUID (from our DB)
 */
export async function createTNClientForTienda(tiendaId: string): Promise<{
  client: TiendaNubeClient
  tienda: TiendaRecord
}> {
  const supabase = getAdminClient()

  const { data: tienda, error } = await supabase
    .from("tiendas")
    .select("*")
    .eq("id", tiendaId)
    .eq("activa", true)
    .single()

  if (error || !tienda) {
    throw new Error(`Tienda not found or inactive: ${tiendaId}`)
  }

  const client = new TiendaNubeClient(tienda.tienda_nube_store_id, tienda.access_token)

  return { client, tienda: tienda as TiendaRecord }
}

/**
 * Create a TN client by TN store_id (used in webhook handler)
 */
export async function createTNClientByStoreId(tnStoreId: string): Promise<{
  client: TiendaNubeClient
  tienda: TiendaRecord
}> {
  const supabase = getAdminClient()

  const { data: tienda, error } = await supabase
    .from("tiendas")
    .select("*")
    .eq("tienda_nube_store_id", tnStoreId)
    .eq("activa", true)
    .single()

  if (error || !tienda) {
    throw new Error(`No active tienda found for TN store_id: ${tnStoreId}`)
  }

  const client = new TiendaNubeClient(tienda.tienda_nube_store_id, tienda.access_token)

  return { client, tienda: tienda as TiendaRecord }
}

/**
 * Get all active tiendas
 */
export async function getActiveTiendas(): Promise<TiendaRecord[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("tiendas")
    .select("*")
    .eq("activa", true)

  if (error) throw new Error(error.message)
  return (data || []) as TiendaRecord[]
}
