import type { ProyectoMedioTipo } from "@/domain/proyecto/entities";

/** Formatos que acepta la galería para imágenes. */
export const FORMATOS_IMAGEN: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
/** Formatos que acepta la galería para videos. */
export const FORMATOS_VIDEO: readonly string[] = ["video/mp4", "video/webm"];
/** Límite de la imagen, igual que el del bucket. */
export const LIMITE_IMAGEN_BYTES = 10 * 1024 * 1024;
/** Límite del video que se sube (tope global de Supabase en plan Free). */
export const LIMITE_VIDEO_BYTES = 50 * 1024 * 1024;
/** Video que se puede elegir: si pasa del límite de subida, se comprime antes. */
export const LIMITE_VIDEO_ORIGEN_BYTES = 1024 * 1024 * 1024;

export const FORMATOS_ADMITIDOS = [...FORMATOS_IMAGEN, ...FORMATOS_VIDEO];

/** `imagen` / `video` según el tipo MIME, o `null` si el formato no va. */
export function tipoDeArchivo(file: File): ProyectoMedioTipo | null {
  if (FORMATOS_IMAGEN.includes(file.type)) return "imagen";
  if (FORMATOS_VIDEO.includes(file.type)) return "video";
  return null;
}

/**
 * Regla de negocio compartida por la UI (que avisa antes de subir) y por el
 * almacenamiento (que es el que no deja pasar nada raro). Devuelve el mensaje
 * de error, o `null` si el archivo es válido.
 */
export function validarArchivoMedio(
  file: File,
  limiteVideo: number = LIMITE_VIDEO_BYTES,
): string | null {
  const tipo = tipoDeArchivo(file);
  if (!tipo) {
    return "Formato no admitido: usá PNG, JPG, WEBP, MP4 o WEBM";
  }
  const limite = tipo === "imagen" ? LIMITE_IMAGEN_BYTES : limiteVideo;
  if (file.size > limite) {
    const mb = Math.round(limite / (1024 * 1024));
    return `El archivo supera los ${mb} MB`;
  }
  return null;
}

export interface SubirMedioProyectoInput {
  proyectoId: number;
  file: File;
}

export interface SubirMedioProyectoResult {
  /** URL pública con la que se sirve el archivo. */
  url: string;
}

/**
 * Puerto (implementado en infraestructura) para guardar fotos y videos del
 * proyecto en el almacenamiento de objetos. La URL que devuelve es la que se
 * persiste en `proyecto_medios.url`.
 */
export interface ProyectoMedioStorage {
  upload(input: SubirMedioProyectoInput): Promise<SubirMedioProyectoResult>;
  /** Borrado "mejor esfuerzo": si la URL no es reconocible, no hace nada. */
  removeByUrl(url: string): Promise<void>;
}
