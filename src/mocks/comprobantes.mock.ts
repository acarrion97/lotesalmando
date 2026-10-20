import type { Comprobante } from "@/domain/comprobante/entities";

/**
 * Solo para `VITE_DATA_PROVIDER=mock`. La cuota 4 (contrato 1) está
 * pendiente en `cobranzas.mock`, así que sirve para probar el ciclo de
 * revisión: aprobar / rechazar un comprobante.
 */
export const comprobantes: Comprobante[] = [
  {
    id_comprobante: 1,
    id_cobranza: 4,
    id_cliente: 1,
    cedula: "1804567890",
    monto_pagado: 1458,
    archivo_url: "cobranza-4/1791900000000-comprobante-banco.png",
    archivo_tipo: "imagen",
    archivo_nombre: "comprobante-banco.png",
    estado: "pendiente",
    nota_rechazo: null,
    creado_en: new Date().toISOString(),
  },
];
