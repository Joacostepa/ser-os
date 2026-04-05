"use client"

import { useState, useRef, useEffect } from "react"

interface CeldaEditableProps {
  valor: number
  prefijo?: string
  sufijo?: string
  onGuardar: (nuevoValor: number) => Promise<void>
  className?: string
}

export function CeldaEditable({ valor, prefijo, sufijo, onGuardar, className }: CeldaEditableProps) {
  const [editando, setEditando] = useState(false)
  const [valorTemp, setValorTemp] = useState(valor.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editando) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editando])

  async function guardar() {
    const numero = parseFloat(valorTemp)
    if (isNaN(numero) || numero < 0) {
      setValorTemp(valor.toString())
      setEditando(false)
      return
    }

    if (numero !== valor) {
      await onGuardar(numero)
    }
    setEditando(false)
  }

  function cancelar() {
    setValorTemp(valor.toString())
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="flex items-center">
        {prefijo && <span className="text-stone-400 text-sm mr-0.5">{prefijo}</span>}
        <input
          ref={inputRef}
          type="number"
          value={valorTemp}
          onChange={(e) => setValorTemp(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar()
            if (e.key === "Escape") cancelar()
          }}
          className="w-20 text-sm font-mono text-stone-800 border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-blue-50"
          min="0"
          step="any"
        />
        {sufijo && <span className="text-stone-400 text-sm ml-0.5">{sufijo}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => { setValorTemp(valor.toString()); setEditando(true) }}
      className={`text-sm font-mono hover:bg-blue-50 hover:text-blue-700 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${valor === 0 ? "text-red-400" : "text-stone-800"} ${className || ""}`}
    >
      {prefijo}{Number(valor).toLocaleString("es-AR")}{sufijo}
    </button>
  )
}
