/**
 * Comprobante de pago enviado por el cliente desde el portal público.
 *
 * No es un `Pago`: el cliente no tiene sesión y no puede escribir en
 * `pagos` (esa tabla exige `id_usuario`). El comprobante queda en
 * `pendiente` hasta que el asesor lo revisa; recién ahí se registra el
 * pago real y la cuota pasa a `pagada`.
 */
export type ComprobanteEstado = "pendiente" | "aprobado" | "rechazado";

/** Imagen (png/jpg/webp) o PDF; el archivo vive en el bucket privado `comprobantes`. */
export type ComprobanteTipoArchivo = "imagen" | "pdf";

export interface Comprobante {
  id_comprobante: number;
  id_cobranza: number;
  /** Duplicado a propósito: es la llave del portal y queda como auditoría. */
  id_cliente: number;
  cedula: string;
  monto_pagado: number;
  /** Objeto del bucket privado; no es una URL pública. */
  archivo_url: string;
  archivo_tipo: ComprobanteTipoArchivo;
  archivo_nombre: string | null;
  estado: ComprobanteEstado;
  /** Solo cuando el asesor lo rechaza (ej: "la foto no se lee"). */
  nota_rechazo: string | null;
  creado_en?: string;
  revisado_en?: string | null;
  id_revisado_por?: number | null;
}
