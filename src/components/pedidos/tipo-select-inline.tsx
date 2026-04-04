"use client"

import { useState } from "react"

interface TipoSelectInlineProps {
  pedidoId: string
  onClassify: (pedidoId: string, tipo: string) => void
}

export function TipoSelectInline({ pedidoId, onClassify }: TipoSelectInlineProps) {
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const tipo = e.target.value
    if (!tipo) return
    setLoading(true)
    try {
      onClassify(pedidoId, tipo)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      onChange={handleChange}
      disabled={loading}
      defaultValue=""
      className={`text-[11px] py-1 px-2 rounded-md border border-dashed border-amber-300 bg-amber-50 text-amber-700 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400 ${
        loading ? "opacity-50 cursor-wait" : ""
      }`}
    >
      <option value="" disabled>
        Clasificar...
      </option>
      <option value="logo_ser">Logo SER</option>
      <option value="marca_blanca">Marca blanca</option>
      <option value="personalizado">Personalizado</option>
    </select>
  )
}
