import type { LoteEstado, PuntoPlano } from "@/domain/lote/entities";

/** Lote tal como se dibuja sobre el plano del proyecto. */
export interface PlanoLote {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  estado: LoteEstado;
  /** Nombre/código de la manzana, para mostrar "Manzana X - Lote Y". */
  manzana: string;
  /** No se expone en el mapa público. */
  precio_lista?: number;
  poligono: PuntoPlano[] | null;
}

/** Lo que ve cualquier visitante en `/mapa/:slug` (sin datos sensibles). */
export interface MapaPublico {
  proyecto: string;
  url_publica: string | null;
  lotes: PlanoLote[];
}
