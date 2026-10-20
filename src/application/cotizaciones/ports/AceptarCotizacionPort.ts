export interface AceptarCotizacionCommand {
  id_cotizacion: number;
  /** Usuario logueado que registra la venta. */
  id_usuario: number;
}

export interface ResultadoAceptacion {
  id_venta: number;
  id_contrato: number;
  cuotas_generadas: number;
}

/**
 * Aceptación de una cotización: una sola operación atómica que crea la
 * venta, mueve el lote, registra inventario, crea el contrato y genera las
 * cuotas del plan (spec `cotizaciones/aceptacion`).
 *
 * En producción la implementa la RPC `aceptar_cotizacion` de la migración
 * 012; en modo mock la replica con los repositorios en memoria.
 */
export interface AceptarCotizacionPort {
  execute(command: AceptarCotizacionCommand): Promise<ResultadoAceptacion>;
}
