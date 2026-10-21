/** Límite del bucket `contratos` (migración 035): 10 MB. */
export const LIMITE_DOCUMENTO_CONTRATO_BYTES = 10 * 1024 * 1024;

const FORMATOS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

/** `null` si el archivo sirve, o el mensaje para quien lo anexa. */
export function validarArchivoDocumentoContrato(file: File): string | null {
  if (!FORMATOS[file.type as keyof typeof FORMATOS]) return "Solo se aceptan archivos PDF o Word (.docx)";
  if (file.size > LIMITE_DOCUMENTO_CONTRATO_BYTES) return "El archivo supera los 10 MB";
  return null;
}

export function tipoDeArchivoDocumentoContrato(file: File): "pdf" | "docx" {
  return FORMATOS[file.type as keyof typeof FORMATOS] ?? "pdf";
}

export interface SubirDocumentoContratoInput {
  contratoId: number;
  file: File;
}

export interface SubirDocumentoContratoResult {
  path: string;
  tipo: "pdf" | "docx";
  nombre: string;
}

/**
 * Bucket PRIVADO `contratos`: el documento de un contrato tiene datos del
 * comprador, así que nadie lo lee sin sesión. El backoffice (autenticado)
 * sube y baja con URLs firmadas.
 */
export interface DocumentoContratoStorage {
  upload(input: SubirDocumentoContratoInput): Promise<SubirDocumentoContratoResult>;
  firmarUrl(path: string): Promise<string>;
  /** URL firmada que además baja el archivo con el nombre indicado. */
  firmarUrlDeDescarga(path: string, nombre: string): Promise<string>;
  removeByPath(path: string): Promise<void>;
}
