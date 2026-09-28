export type LoteEstado = "disponible" | "reservado" | "vendido" | "en_negociacion" | "bloqueado" | "no_disponible";

/** Vértice de un polígono sobre el plano, normalizado a [0, 1] (x = ancho, y = alto). */
export type PuntoPlano = [number, number];

export interface Lote {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  precio_lista: number;
  estado: LoteEstado;
  /** Contorno del lote sobre la imagen del plano del proyecto; `null` si no está dibujado. */
  poligono?: PuntoPlano[] | null;
}
