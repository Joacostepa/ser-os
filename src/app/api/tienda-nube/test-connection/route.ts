import { NextRequest, NextResponse } from "next/server"
import { TiendaNubeClient } from "@/lib/tienda-nube/client"

export async function POST(request: NextRequest) {
  try {
    const { store_id, access_token } = await request.json()

    if (!store_id || !access_token) {
      return NextResponse.json({ error: "store_id y access_token son requeridos" }, { status: 400 })
    }

    const client = new TiendaNubeClient(store_id, access_token)
    const result = await client.getStoreInfo()

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      store: {
        id: result.data.id,
        name: result.data.name,
        email: result.data.email,
        domain: result.data.original_domain,
        currency: result.data.main_currency,
        plan: result.data.plan_name,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
