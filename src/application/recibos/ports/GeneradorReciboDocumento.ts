import type { Recibo } from "@/domain/recibo/entities";

/**
 * Representación impresa (estilo RIDE) del recibo de pago: se arma en el
 * navegador, únicamente con el snapshot fiscal que quedó persistido al
 * emitirlo. Por eso reimprimir un recibo viejo muestra los datos tal cual
 * estaban ese día, aunque después cambien los datos del cliente o del
 * proyecto.
 */
export interface GeneradorReciboDocumento {
  generar(recibo: Recibo): Promise<Blob>;
}

/**
 * `recibo-001-001-000000001.pdf`: el nombre deriva del número persistido,
 * así que la reimprenta de un mismo recibo baja siempre el mismo archivo.
 */
export function nombreArchivoRecibo(recibo: Pick<Recibo, "numero_recibo">): string {
  const base = recibo.numero_recibo.replace(/[^0-9A-Za-z-]/g, "-");
  return `recibo-${base || "sin-numero"}.pdf`;
}
