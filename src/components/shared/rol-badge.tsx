import { ROL_CONFIG } from "@/lib/auth/permisos"

export function RolBadge({ rol }: { rol: string }) {
  const config = ROL_CONFIG[rol] || { label: rol, bg: "bg-stone-100", text: "text-stone-500" }
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  )
}
