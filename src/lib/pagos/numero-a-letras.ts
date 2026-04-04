const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO",
  "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
  "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE",
  "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE",
  "VEINTIUN", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO",
  "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
]

const DECENAS = [
  "", "", "", "TREINTA", "CUARENTA", "CINCUENTA",
  "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
]

const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
]

function convertirGrupo(n: number): string {
  if (n === 0) return ""
  if (n === 100) return "CIEN"

  const centena = Math.floor(n / 100)
  const resto = n % 100

  let resultado = CENTENAS[centena]

  if (resto === 0) return resultado

  if (centena > 0) resultado += " "

  if (resto < 30) {
    resultado += UNIDADES[resto]
  } else {
    const decena = Math.floor(resto / 10)
    const unidad = resto % 10
    resultado += DECENAS[decena]
    if (unidad > 0) resultado += " Y " + UNIDADES[unidad]
  }

  return resultado
}

/**
 * Converts a number to its Spanish text representation.
 * Works for amounts up to 999,999,999.
 * Example: 150000 -> "CIENTO CINCUENTA MIL"
 */
export function numeroALetras(monto: number): string {
  if (monto === 0) return "CERO"

  const entero = Math.floor(Math.abs(monto))

  if (entero === 0) return "CERO"

  const millones = Math.floor(entero / 1_000_000)
  const miles = Math.floor((entero % 1_000_000) / 1_000)
  const unidades = entero % 1_000

  const partes: string[] = []

  if (millones > 0) {
    if (millones === 1) {
      partes.push("UN MILLON")
    } else {
      partes.push(convertirGrupo(millones) + " MILLONES")
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      partes.push("MIL")
    } else {
      partes.push(convertirGrupo(miles) + " MIL")
    }
  }

  if (unidades > 0) {
    partes.push(convertirGrupo(unidades))
  }

  return partes.join(" ")
}
