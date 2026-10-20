/**
 * Lo que ve un cliente que entra al portal con su cédula (sin sesión).
 * Se arma en la RPC `portal_cliente_por_cedula` (migración 035).
 */
export interface PortalCuota {
  id_cobranza: number;
  numero_cuota: number;
  monto_cuota: number;
  fecha_vencimiento: string | null;
  estado: "pendiente" | "pagada" | "vencida";
  /** Último comprobante enviado para esta cuota; `null` si nunca envió. */
  comprobante: {
    estado: "pendiente" | "aprobado" | "rechazado";
    monto_pagado: number;
    fecha: string | null;
    nota: string | null;
  } | null;
}

export interface PortalContrato {
  id_contrato: number;
  numero_contrato: string;
  monto_total: number;
  fecha: string | null;
  lote: string | null;
  proyecto: string | null;
  cuotas: PortalCuota[];
}

export interface PortalCliente {
  id_cliente: number;
  nombres: string;
  email: string | null;
  telefono: string | null;
  contratos: PortalContrato[];
}

export interface PortalDatos {
  existe: boolean;
  clientes: PortalCliente[];
}
