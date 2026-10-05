/** Orden natural por numero de lote: H2 antes que H10, L1.2 antes que L1.10. */
export function compararNumeroLote(a: { numero_lote: string }, b: { numero_lote: string }): number {
  return a.numero_lote.localeCompare(b.numero_lote, undefined, { numeric: true, sensitivity: "base" });
}
