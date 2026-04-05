"use client"

import { Search } from "lucide-react"

export function CommandKTrigger({ onClick }: { onClick: () => void }) {
  return (
    <>
      {/* Desktop */}
      <button
        onClick={onClick}
        className="hidden md:flex items-center gap-2 bg-stone-100 rounded-lg px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-200 w-[240px]"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="bg-stone-200 text-stone-500 text-[10px] font-mono px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </button>
      {/* Mobile */}
      <button
        onClick={onClick}
        className="md:hidden p-1 text-stone-400 hover:text-stone-600"
      >
        <Search className="w-4 h-4" />
      </button>
    </>
  )
}
