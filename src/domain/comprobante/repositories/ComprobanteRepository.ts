import type { Comprobante, ComprobanteEstado } from "../entities";

export interface ComprobanteAPagar {
  id_cobranza: number;
  monto_pagado: number;
  archivo_url: string;
  archivo_tipo: "imagen" | "pdf";
  archivo_nombre: string | null;
}

export interface RevisionComprobante {
  estado: Exclude<ComprobanteEstado, "pendiente">;
  /** Obligatorio al rechazar, opcional al aprobar. */
  nota_rechazo?: string | null;
}

export interface ComprobanteRepository {
  getAll(): Promise<Comprobante[]>;
  /** Comprobantes de una empresa (se alcanza por la cadena contrato → cobranza). */
  getByEmpresaId(empresaId: number): Promise<Comprobante[]>;
  /** Comprobantes de una cuota concreta, del más reciente al más viejo. */
  getByCobranzaId(cobranzaId: number): Promise<Comprobante[]>;
  getById(id: number): Promise<Comprobante | null>;
  /** Aprueba o rechaza; deja `revisado_en` y el usuario que revisó. */
  revisar(id: number, revision: RevisionComprobante, idUsuario: number): Promise<Comprobante>;
}
