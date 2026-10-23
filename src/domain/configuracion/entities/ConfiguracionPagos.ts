/**
 * Datos fiscales que van impresos en los recibos de pago de UN proyecto
 * (loteo). Cada proyecto puede emitir recibos bajo una razón social
 * distinta, así que se guarda por proyecto y no en la configuración de
 * la empresa.
 *
 * Se edita desde Cobranzas/Pagos → botón «Configuración de recibos».
 * Si la razón social queda vacía, el recibo la toma de la empresa; las
 * direcciones fiscales sí son obligatorias para emitir.
 *
 * El RUC no vive acá: es el mismo que firma el contrato del proyecto,
 * así que la emisión lo toma de `ConfiguracionContrato.ruc` (y si está
 * vacío, de la empresa). Se carga una sola vez y no se pide dos veces.
 */
export interface ConfiguracionPagos {
  id_configuracion_pagos: number;
  id_empresa: number;
  id_proyecto: number;
  /** Razón social que emite los recibos (vacío = `empresa.razon_social`). */
  razon_social?: string | null;
  /** Dirección fiscal de la matriz del emisor. */
  direccion_matriz?: string | null;
  /** Dirección fiscal del establecimiento emisor. */
  direccion_establecimiento?: string | null;
  /** Código SRI de tres dígitos del establecimiento. */
  codigo_establecimiento?: string | null;
  /** Punto de emisión SRI de tres dígitos. */
  punto_emision?: string | null;
}
