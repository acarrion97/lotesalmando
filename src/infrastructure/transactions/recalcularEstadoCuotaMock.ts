import type { CobranzaEstado } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";

/**
 * Mismo criterio que la función SQL `recalcular_estado_cuota` (migración 048):
 * lo pagado cubre la cuota -> 'pagada'; si no, con la fecha ya pasada ->
 * 'vencida'; si no -> 'pendiente'.
 *
 * Solo para el modo demo: `MockCobranzaRepository.updateEstado` ya emula el
 * trigger que recalcula el estado de la venta.
 */
export async function recalcularEstadoCuotaMock(
  cobranzas: CobranzaRepository,
  pagos: PagoRepository,
  idCobranza: number,
): Promise<CobranzaEstado | null> {
  const cobranza = await cobranzas.getById(idCobranza);
  if (!cobranza) return null;

  const pagosCuota = await pagos.getByCobranzaId(idCobranza);
  const total = pagosCuota.reduce((suma, p) => suma + Math.round(p.monto_pagado * 100), 0) / 100;

  const hoy = new Date().toISOString().slice(0, 10);
  const vencimiento = (cobranza.fecha_vencimiento ?? "").slice(0, 10);
  const estado: CobranzaEstado =
    total >= cobranza.monto_cuota ? "pagada" : vencimiento && vencimiento < hoy ? "vencida" : "pendiente";

  await cobranzas.updateEstado(idCobranza, estado);
  return estado;
}
