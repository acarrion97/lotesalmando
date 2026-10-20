/**
 * Ubicación real del plano sobre el terreno: permite superponer la imagen
 * del plano sobre la vista satélite (y sobre la vista 3D) a escala real.
 */
export interface UbicacionPlano {
  /** Latitud central de la imagen del plano (WGS84). */
  centro_lat: number;
  /** Longitud central de la imagen del plano (WGS84). */
  centro_lng: number;
  /** Ancho real del plano en metros; la altura sale de la proporción de la imagen. */
  ancho_m: number;
}

export interface Mapa {
  id_mapa: number;
  id_proyecto: number;
  /** URL pública de la imagen del plano; `null` si el proyecto no tiene plano. */
  url_publica: string | null;
  /** Identificador de la página pública `/mapa/:slug`; `null` si no está publicado. */
  slug?: string | null;
  centro_lat?: number | null;
  centro_lng?: number | null;
  ancho_m?: number | null;
}

/**
 * Extrae la ubicación de un plano (o del mapa público); devuelve `null`
 * si falta algún dato o alguno está fuera de rango.
 */
export function ubicacionDe(
  mapa: Pick<Mapa, "centro_lat" | "centro_lng" | "ancho_m"> | null | undefined,
): UbicacionPlano | null {
  if (!mapa) return null;
  const { centro_lat: lat, centro_lng: lng, ancho_m: ancho } = mapa;
  if (lat == null || lng == null || ancho == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(ancho)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (ancho <= 0) return null;
  return { centro_lat: lat, centro_lng: lng, ancho_m: ancho };
}
