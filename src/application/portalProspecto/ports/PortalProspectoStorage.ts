/** Límite del bucket `documentos_prospectos` (migración 044): 10 MB. */
export const LIMITE_DOCUMENTO_BYTES = 10 * 1024 * 1024;

const FORMATOS = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/**
 * Devuelve `null` si el archivo sirve, o el mensaje para el visitante.
 * Un solo lugar donde se decide qué se acepta (el bucket también valida,
 * pero el visitante necesita el aviso al instante).
 */
export function validarArchivoDocumento(file: File): string | null {
  if (!FORMATOS.includes(file.type)) {
    return "Solo se aceptan imágenes (PNG, JPG o WEBP) o PDF";
  }
  if (file.size > LIMITE_DOCUMENTO_BYTES) return "El archivo supera los 10 MB";
  if (file.size === 0) return "El archivo está vacío";
  return null;
}

export interface SubirDocumentoInput {
  /** Carpeta de destino: `prospecto-<id>/`, que es lo que exige la política. */
  carpeta: string;
  file: File;
}

export interface SubirDocumentoResult {
  /** Path dentro del bucket privado: es lo que se persiste en `prospecto_documento`. */
  path: string;
}

/**
 * Bucket PRIVADO `documentos_prospectos`: el portal (anon) solo sube, y
 * el backoffice lee con URLs firmadas. La URL pública no existe para este
 * bucket, por eso el resultado es un path y no una URL.
 */
export interface PortalProspectoStorage {
  upload(input: SubirDocumentoInput): Promise<SubirDocumentoResult>;
  /** URL firmada y temporal (1 h) para ver o descargar el archivo. */
  firmarUrl(path: string): Promise<string>;
  removeByPath(path: string): Promise<void>;
}
