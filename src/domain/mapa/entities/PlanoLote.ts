import type { LoteEstado, PuntoPlano } from "@/domain/lote/entities";

/** Lote tal como se dibuja sobre el plano del proyecto. */
export interface PlanoLote {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  estado: LoteEstado;
  /** Nombre/código de la manzana, para mostrar "Manzana X - Lote Y". */
  manzana: string;
  /**
   * Precio de lista. En el mapa público NO se muestra en los tooltips: solo
   * aparece en la ficha del lote y en la calculadora de financiamiento.
   */
  precio_lista?: number;
  /** Contorno sobre el plano; `null` si el lote todavía no está ubicado. */
  poligono: PuntoPlano[] | null;
}
