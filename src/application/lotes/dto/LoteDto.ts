import type { LoteEstado } from "@/domain/lote/entities";

export interface LoteDto {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  precio_lista: number;
  estado: LoteEstado;
  superficie_m2?: number | null;
  codigo_catastral?: string | null;
  medidas?: string | null;
}

export type { LoteEstado };
