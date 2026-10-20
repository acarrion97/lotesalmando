/** Documento (Word o PDF) anexado o generado para un contrato. */
export type DocumentoContratoTipo = "docx" | "pdf";
/** `subido` = alguien anexó un archivo; `generado` = la app lo construyó. */
export type DocumentoContratoOrigen = "subido" | "generado";

export interface Contrato {
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
