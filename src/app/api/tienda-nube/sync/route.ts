import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { importProducts, importCustomers, importOrders } from "@/lib/tienda-nube/sync/import"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { tienda_id, type } = await request.json()

    if (!tienda_id || !type) {
      return NextResponse.json(
        { error: "tienda_id y type son requeridos" },
        { status: 400 }
      )
    }

    if (!["products", "customers", "pedidos"].includes(type)) {
      return NextResponse.json(
        { error: "type debe ser 'products', 'customers' o 'pedidos'" },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Create sync job
    const { data: job, error } = await supabase
      .from("sync_jobs")
      .insert({
        tienda_id,
        tipo: type,
        status: "pending",
      })
      .select("id")
      .single()

    if (error) throw error

    // Process async
    after(async () => {
      if (type === "products") {
        await importProducts(tienda_id, job.id)
      } else if (type === "customers") {
        await importCustomers(tienda_id, job.id)
      } else if (type === "pedidos") {
        await importOrders(tienda_id, job.id)
      }
    })

    return NextResponse.json({ ok: true, job_id: job.id })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}

// GET — check sync job status
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id")

  if (!jobId) {
    return NextResponse.json({ error: "job_id requerido" }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data: job } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  return NextResponse.json({ ok: true, job })
}
