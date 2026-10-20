import type { ComprobanteTipoArchivo } from "@/domain/comprobante/entities";

/** Límite del bucket `comprobantes` (migración 035): 10 MB. */
export const LIMITE_COMPROBANTE_BYTES = 10 * 1024 * 1024;

const FORMATOS = {
  "image/png": "imagen",
  "image/jpeg": "imagen",
  "image/webp": "imagen",
  "application/pdf": "pdf",
} as const;

/**
 * Devuelve `null` si el archivo sirve, o el mensaje para el visitante.
 * Un solo lugar donde se decide qué se acepta (el bucket también valida,
 * pero el visitante necesita el aviso al instante).
 */
export function validarArchivoComprobante(file: File): string | null {
  const tipo = FORMATOS[file.type as keyof typeof FORMATOS];
  if (!tipo) return "Solo se aceptan imágenes (PNG, JPG o WEBP) o PDF";
  if (file.size > LIMITE_COMPROBANTE_BYTES) return "El archivo supera los 10 MB";
  return null;
}

/** Clasifica el mime en el tipo que guarda la base. */
export function tipoDeArchivoComprobante(file: File): ComprobanteTipoArchivo {
  return FORMATOS[file.type as keyof typeof FORMATOS] === "pdf" ? "pdf" : "imagen";
}

export interface SubirComprobanteInput {
  /** Carpeta de destino: `cobranza-<id>/`, que es lo que exige la política. */
  carpeta: string;
  file: File;
}

export interface SubirComprobanteResult {
  /** Path dentro del bucket privado: es lo que se persiste en `comprobantes`. */
  path: string;
}

/**
 * Bucket PRIVADO `comprobantes`: el portal (anon) solo sube, y el
 * backoffice lee con URLs firmadas. La URL pública no existe para este
 * bucket, por eso el resultado es un path y no una URL.
 */
export interface ComprobanteStorage {
  upload(input: SubirComprobanteInput): Promise<SubirComprobanteResult>;
  /** URL firmada y temporal (1 h) para ver o descargar el archivo. */
  firmarUrl(path: string): Promise<string>;
  removeByPath(path: string): Promise<void>;
}
