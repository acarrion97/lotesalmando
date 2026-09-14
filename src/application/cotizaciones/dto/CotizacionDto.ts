export type CotizacionEstado = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface CotizacionDto {
  id_cotizacion: number;
  id_cliente: number;
  id_lote: number;
  precio_ofertado: number;
  estado: CotizacionEstado;
}
