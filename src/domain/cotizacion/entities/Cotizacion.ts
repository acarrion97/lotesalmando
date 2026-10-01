export type CotizacionEstado = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface Cotizacion {
  id_cotizacion: number;
  id_cliente: number;
  id_lote: number;
  precio_ofertado: number;
  estado: CotizacionEstado;
  /** Asesor que realizó la cotización; null cuando no la registró un asesor. */
  id_asesor: number | null;
  /** Valor de la entrada ofrecida al cliente. */
  monto_entrada: number;
  /** Número de cuotas del plan ofrecido al cliente. */
  num_cuotas: number;
}
