"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { descomponerIVA } from "@/lib/iva"
import { formatearMontoCompleto } from "@/lib/formatters"
import { CondicionFiscalBadge } from "@/components/shared/condicion-fiscal-badge"

interface ConfirmacionIVAModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (incluyeIva: boolean) => void
  tipo: "orden_compra" | "gasto" | "pago_proveedor"
  titulo: string
  subtitulo?: string
  monto: number
  incluyeIvaDefault: boolean
  tasaIva?: number
  proveedorNombre?: string
  condicionFiscal?: string | null
  totalOC?: number
  yaPagado?: number
  onGuardarCondicionFiscal?: (condicion: string) => void
}

export function ConfirmacionIVAModal(props: ConfirmacionIVAModalProps) {
  const [incluyeIva, setIncluyeIva] = useState(props.incluyeIvaDefault)
  const [condicionFiscal, setCondicionFiscal] = useState(props.condicionFiscal || "")
  const [guardarCondicion, setGuardarCondicion] = useState(true)
  const [paso, setPaso] = useState<"condicion" | "confirmar">(
    props.tipo === "orden_compra" && !props.condicionFiscal ? "condicion" : "confirmar"
  )
  const tasa = props.tasaIva || 0.21

  if (!props.open) return null

  const esMono = condicionFiscal === "monotributista" || condicionFiscal === "exento"
  const esRI = condicionFiscal === "responsable_inscripto"
  const esPago = props.tipo === "pago_proveedor"

  // Calcular desglose
  const ivaActivo = esPago ? false : (esMono ? false : incluyeIva)
  const desglose = ivaActivo ? descomponerIVA(props.monto, tasa) : { neto: props.monto, iva: 0, total: props.monto }

  // Pago a proveedor
  const saldoPendiente = props.totalOC != null ? (props.totalOC - (props.yaPagado || 0)) : null
  const saldoRestante = saldoPendiente != null ? saldoPendiente - props.monto : null

  // Desglose de la OC para pago
  const desgloseOC = props.totalOC ? descomponerIVA(props.totalOC, tasa) : null

  function handleConfirm() {
    if (paso === "condicion" && condicionFiscal && guardarCondicion) {
      props.onGuardarCondicionFiscal?.(condicionFiscal)
    }
    props.onConfirm(esPago ? props.incluyeIvaDefault : (esMono ? false : incluyeIva))
  }

  function handleSiguiente() {
    if (!condicionFiscal) return
    if (condicionFiscal === "monotributista" || condicionFiscal === "exento") {
      setIncluyeIva(false)
    } else {
      setIncluyeIva(true)
    }
    setPaso("confirmar")
  }

  // Títulos según tipo
  const tituloModal = esPago
    ? "Confirmá el pago antes de registrar"
    : paso === "condicion"
      ? "Condición fiscal no configurada"
      : ivaActivo
        ? "Confirmá el IVA antes de continuar"
        : "Confirmá el monto antes de continuar"

  const botonLabel = esPago ? "Confirmar y registrar" : "Confirmar y guardar"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={props.onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-[480px] max-w-[calc(100%-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-base font-medium text-stone-800">{tituloModal}</p>
        </div>

        {/* Subtítulo con proveedor/categoría */}
        <div className="px-6 pb-4 space-y-1">
          {props.proveedorNombre && (
            <p className="text-sm text-stone-500">
              Proveedor: {props.proveedorNombre}
              {condicionFiscal && paso === "confirmar" && (
                <span className="ml-2"><CondicionFiscalBadge condicion={condicionFiscal} /></span>
              )}
            </p>
          )}
          {props.subtitulo && <p className="text-sm text-stone-500">{props.subtitulo}</p>}
          {!esPago && props.tipo !== "orden_compra" && (
            <p className="text-sm text-stone-500">
              {props.tipo === "gasto" ? `Gasto: ${props.titulo}` : props.titulo}
            </p>
          )}
        </div>

        {/* Paso 1: Seleccionar condición fiscal */}
        {paso === "condicion" && (
          <div className="px-6 pb-4 space-y-4">
            <p className="text-sm text-stone-500">
              Para calcular correctamente el IVA, indicá la condición fiscal de este proveedor:
            </p>
            <div className="space-y-2">
              {[
                { value: "responsable_inscripto", label: "Responsable Inscripto (factura con IVA)" },
                { value: "monotributista", label: "Monotributista (factura sin IVA)" },
                { value: "exento", label: "Exento (factura sin IVA)" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condicion_fiscal"
                    value={opt.value}
                    checked={condicionFiscal === opt.value}
                    onChange={() => setCondicionFiscal(opt.value)}
                    className="w-4 h-4 text-stone-800"
                  />
                  <span className="text-sm text-stone-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={guardarCondicion} onCheckedChange={(v) => setGuardarCondicion(!!v)} />
              <span className="text-sm text-stone-600">Guardar esta condición fiscal en la ficha del proveedor</span>
            </label>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSiguiente} disabled={!condicionFiscal}>
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: Confirmación */}
        {paso === "confirmar" && (
          <>
            {/* Card de desglose */}
            <div className="bg-stone-50 rounded-lg mx-6 p-4 space-y-2">
              {esPago ? (
                // Pago a proveedor
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Total de la OC:</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(props.totalOC || 0)}</span>
                  </div>
                  {desgloseOC && props.condicionFiscal === "responsable_inscripto" && (
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-400">Neto:</span>
                        <span className="font-mono text-stone-400">{formatearMontoCompleto(desgloseOC.neto)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-400">IVA:</span>
                        <span className="font-mono text-stone-400">{formatearMontoCompleto(desgloseOC.iva)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Ya pagado:</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(props.yaPagado || 0)}</span>
                  </div>
                  <div className="border-t border-stone-200 my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Saldo pendiente:</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(saldoPendiente || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-stone-800">Monto de este pago:</span>
                    <span className="font-mono text-stone-900 text-base">{formatearMontoCompleto(props.monto)}</span>
                  </div>
                  {saldoRestante != null && saldoRestante > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400">Saldo restante después del pago:</span>
                      <span className="font-mono text-stone-400">{formatearMontoCompleto(saldoRestante)}</span>
                    </div>
                  )}
                </>
              ) : (
                // OC o Gasto
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{props.tipo === "orden_compra" ? "Subtotal de items:" : "Monto ingresado:"}</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(props.monto)}</span>
                  </div>

                  {esMono ? (
                    <p className="text-xs text-stone-400 italic mt-2">
                      Proveedor {condicionFiscal === "monotributista" ? "Monotributista" : "Exento"} — sin IVA
                    </p>
                  ) : (
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <Checkbox checked={incluyeIva} onCheckedChange={(v) => setIncluyeIva(!!v)} />
                      <span className="text-sm text-stone-700">
                        {props.tipo === "orden_compra" ? "Los precios incluyen IVA 21%" : "Este monto incluye IVA 21%"}
                      </span>
                    </label>
                  )}

                  <div className="border-t border-stone-200 my-2" />

                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{esMono ? "Tu costo real:" : "Neto (tu costo real):"}</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(desglose.neto)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{ivaActivo ? "IVA 21% (crédito fiscal):" : "IVA:"}</span>
                    <span className="font-mono text-stone-800">{formatearMontoCompleto(desglose.iva)}</span>
                  </div>
                  <div className="border-t border-stone-200 my-2" />
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-stone-800">{esPago ? "Total a pagar:" : "Total a pagar al proveedor:"}</span>
                    <span className="font-mono text-stone-900 text-base">{formatearMontoCompleto(desglose.total)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Nota de advertencia */}
            {!esPago && !esMono && (
              <p className="text-xs text-amber-600 px-6 py-3">
                {incluyeIva
                  ? `Si los precios NO incluyen IVA, destildá la casilla. El total a pagar cambiaría a ${formatearMontoCompleto(props.monto * (1 + tasa))}.`
                  : `Si los precios incluyen IVA, tildá la casilla para separar el crédito fiscal.`
                }
              </p>
            )}
            {esMono && (
              <p className="text-xs text-stone-400 px-6 py-3">
                El monto total es igual al costo porque este proveedor no factura IVA.
              </p>
            )}
            {esPago && (
              <p className="text-xs text-stone-400 px-6 py-3">
                El monto a pagar incluye el IVA porque es lo que se transfiere al proveedor. El crédito fiscal ya se registró al recibir la mercadería.
              </p>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stone-100">
              <Button variant="ghost" onClick={props.onClose} className="text-stone-500">
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="bg-stone-900 hover:bg-stone-800 text-white">
                {botonLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
