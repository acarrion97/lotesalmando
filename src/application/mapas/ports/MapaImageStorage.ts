export interface SubirImagenInput {
  proyectoId: number;
  file: File;
  /**
   * Subcarpeta dentro de `proyecto-<id>/` (p. ej. "render-3d"). Sirve para
   * que el plano y el render vivan como objetos separados y se puedan
   * borrar uno sin tocar al otro.
   */
  carpeta?: string;
}

export interface SubirImagenResult {
  /** URL pública con la que se sirve la imagen. */
  url: string;
}

/**
 * Puerto (implementado en infraestructura) para guardar la imagen del plano
 * en el almacenamiento de objetos. La URL que devuelve es la que se persiste
 * en `mapas.url_publica`.
 */
export interface MapaImageStorage {
  upload(input: SubirImagenInput): Promise<SubirImagenResult>;
  /** Borrado "mejor esfuerzo": si la URL no es reconocible, no hace nada. */
  removeByUrl(url: string): Promise<void>;
}
