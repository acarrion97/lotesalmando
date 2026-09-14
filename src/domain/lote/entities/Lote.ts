export type LoteEstado = "disponible" | "reservado" | "vendido" | "en_negociacion" | "bloqueado" | "no_disponible";

export interface Lote {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  precio_lista: number;
  estado: LoteEstado;
}
