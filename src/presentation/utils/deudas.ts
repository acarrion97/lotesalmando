import type { Pago } from "@/domain/pago/entities";

/**
 * Total cobrado por cada cuota, en pesos.
 *
 * Se suma en centavos enteros para no arrastrar error de coma flotante (mismo
 * criterio que el reporte de cartera y la cartera de Cobranzas). Lo usan los
 * modales y la lista de clientes para saber qué cuotas ya están cubiertas por
 * pagos, aunque su `estado` haya quedado desfasado por una importación.
 */
export function totalPagadoPorCobranza(pagos: Pago[] | undefined | null): Map<number, number> {
  const centavos = new Map<number, number>();
  for (const pago of pagos ?? []) {
    centavos.set(
      pago.id_cobranza,
      (centavos.get(pago.id_cobranza) ?? 0) + Math.round(pago.monto_pagado * 100),
    );
  }
  return new Map([...centavos.entries()].map(([id, c]) => [id, c / 100]));
}

/** Saldo pendiente de una cuota: monto menos lo pagado, nunca negativo. */
export function saldoDeCuota(monto: number, pagado: number): number {
  return Math.max(Math.round(monto * 100) - Math.round(pagado * 100), 0) / 100;
}
