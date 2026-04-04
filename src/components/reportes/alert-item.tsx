import Link from "next/link"

const ALERT_STYLES = {
  red: "bg-red-50",
  amber: "bg-amber-50",
  blue: "bg-blue-50",
}

const DOT_STYLES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
}

interface AlertItemProps {
  type: "red" | "amber" | "blue"
  text: string
  href?: string
}

export function AlertItem({ type, text, href }: AlertItemProps) {
  const content = (
    <div className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm text-stone-700 ${ALERT_STYLES[type]}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT_STYLES[type]}`} />
      <span>{text}</span>
    </div>
  )

  if (href) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity">{content}</Link>
  }
  return content
}
