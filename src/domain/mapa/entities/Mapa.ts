export interface Mapa {
  id_mapa: number;
  id_proyecto: number;
  /** URL pública de la imagen del plano; `null` si el proyecto no tiene plano. */
  url_publica: string | null;
  /** Identificador de la página pública `/mapa/:slug`; `null` si no está publicado. */
  slug?: string | null;
}
