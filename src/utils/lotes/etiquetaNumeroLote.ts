/**
 * Etiqueta legible de un lote: si el numero ya trae letras (H3, L1.7) basta con
 * el; si es solo numerico (3) se antepone el nombre de la manzana para ubicarlo.
 */
export function etiquetaNumeroLote(numeroLote: string | null | undefined, nombreManzana?: string): string {
  const numero = String(numeroLote ?? "").trim();
  return /[A-Za-z]/.test(numero) || !nombreManzana ? numero : `${nombreManzana} - ${numero}`;
}
