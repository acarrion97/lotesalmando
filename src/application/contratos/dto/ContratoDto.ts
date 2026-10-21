import type { DocumentoContratoOrigen, DocumentoContratoTipo } from "@/domain/contrato/entities";

export interface ContratoDto {
  id_contrato: number;
  id_venta: number;
  numero_contrato: string;
  monto_total: number;
  created_at?: string;
  /** Objeto del bucket privado `contratos`; `null` si aún no hay documento. */
  documento_url?: string | null;
  documento_tipo?: DocumentoContratoTipo | null;
  documento_nombre?: string | null;
  documento_origen?: DocumentoContratoOrigen | null;
  documento_subido_en?: string | null;
}
