const ESTILOS = `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;`

export function getTemplateDia1(estado: string, nivel: string): string {
  if (estado === "dormida") {
    return `<div style="${ESTILOS}">
      <p>Hola {{nombre}},</p>
      <p>Hace un tiempo que no nos visitás y te extrañamos.</p>
      <p>Queremos que sepas que seguimos acá, con novedades que te van a encantar.</p>
      <p>Pasá a vernos: <a href="https://www.sermayorista.com.ar/">sermayorista.com.ar</a></p>
      <p>Con cariño,<br/><strong>Sheila</strong><br/>Equipo Sermimomento</p>
    </div>`
  }

  const esVip = nivel === "vip"
  return `<div style="${ESTILOS}">
    <p>Hola {{nombre}}!</p>
    ${estado === "activa"
      ? `<p>Gracias por seguir siendo parte del Club SER${esVip ? " VIP" : ""}!</p>`
      : estado === "inactiva"
        ? `<p>Te extrañamos! Hace un tiempito que no nos visitás.</p><p>Tenemos algo especial para vos:</p>`
        : estado === "reactivacion"
          ? `<p>Hace mucho que no nos vemos! Queremos que vuelvas:</p>`
          : `<p>Bienvenida al Club SER! Te damos un regalo para tu primera compra mayorista:</p>`
    }
    <p>Este mes tenés tu <strong>{{descuento}}% OFF</strong> exclusivo:</p>
    <p style="font-size: 20px; font-weight: bold; background: #f5f5f4; padding: 12px 16px; border-radius: 8px; display: inline-block;">
      {{codigo}}
    </p>
    <p>Válido hasta el {{fecha_fin}}<br/>Compra mínima mayorista: $120.000</p>
    ${Number("{{racha}}") > 0 ? `<p>Tu racha: {{racha}} meses consecutivos!</p>` : ""}
    <p><a href="https://www.sermayorista.com.ar/" style="color: #3d4a3e; font-weight: bold;">Ir a la tienda</a></p>
    <p>Con cariño,<br/><strong>Sheila</strong><br/>Equipo Sermimomento</p>
  </div>`
}

export function getTemplateDia10(): string {
  return `<div style="${ESTILOS}">
    <p>Hola {{nombre}}!</p>
    <p>Tu cupón <strong>{{codigo}}</strong> del <strong>{{descuento}}% OFF</strong> sigue activo.</p>
    <p>No te lo pierdas, es válido hasta el {{fecha_fin}}.</p>
    <p><a href="https://www.sermayorista.com.ar/" style="color: #3d4a3e; font-weight: bold;">Usalo ahora</a></p>
    <p>Con cariño,<br/><strong>Sheila</strong></p>
  </div>`
}

export function getTemplateDia27(): string {
  return `<div style="${ESTILOS}">
    <p>Hola {{nombre}}!</p>
    <p>Último aviso: tu cupón <strong>{{codigo}}</strong> del <strong>{{descuento}}% OFF</strong> vence pronto.</p>
    <p>Si no lo usás, el mes que viene tu descuento puede bajar. No lo pierdas!</p>
    <p><a href="https://www.sermayorista.com.ar/" style="color: #3d4a3e; font-weight: bold;">Comprar ahora</a></p>
    <p>Con cariño,<br/><strong>Sheila</strong></p>
  </div>`
}

export function getAsunto(tipo: string, estado: string, nivel: string): string {
  const esVip = nivel === "vip"
  const asuntos: Record<string, Record<string, string>> = {
    dia1: {
      activa: `Tu ${esVip ? "12" : "10"}% OFF exclusivo del Club SER${esVip ? " VIP" : ""}`,
      inactiva: "Te extrañamos! Tenemos algo para vos",
      dormida: "Hace tiempo que no nos vemos...",
      reactivacion: "Volvé con un descuento especial",
      nunca_compro: "Bienvenida! Tu primer descuento mayorista",
    },
    dia10: { default: "Tu cupón sigue activo" },
    dia27: { default: "Último aviso: tu cupón vence pronto" },
  }
  return asuntos[tipo]?.[estado] || asuntos[tipo]?.default || "Club SER — Novedades"
}

export function procesarTemplate(template: string, datos: Record<string, string | number>): string {
  let html = template
  for (const [key, value] of Object.entries(datos)) {
    html = html.replaceAll(`{{${key}}}`, String(value ?? ""))
  }
  return html
}
