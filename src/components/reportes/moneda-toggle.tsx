"use client"

export type Moneda = "ARS" | "USD"

export function MonedaToggle({
  value,
  onChange,
}: {
  value: Moneda
  onChange: (m: Moneda) => void
}) {
  return (
    <div className="flex items-center border border-stone-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("ARS")}
        className={`px-2 py-1 text-xs font-mono transition-colors ${
          value === "ARS"
            ? "bg-stone-800 text-white"
            : "bg-white text-stone-400 hover:text-stone-600"
        }`}
      >
        ARS
      </button>
      <button
        type="button"
        onClick={() => onChange("USD")}
        className={`px-2 py-1 text-xs font-mono transition-colors ${
          value === "USD"
            ? "bg-stone-800 text-white"
            : "bg-white text-stone-400 hover:text-stone-600"
        }`}
      >
        USD
      </button>
    </div>
  )
}
