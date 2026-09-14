export type EstadoLote = "disponible" | "reservado" | "vendido";

export interface Lote {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  precio_lista: number;
  estado: EstadoLote;
}

export const lotes: Lote[] = [
  { id_lote: 1, id_manzana: 1, numero_lote: "A-01", precio_lista: 35000, estado: "vendido" },
  { id_lote: 2, id_manzana: 1, numero_lote: "A-02", precio_lista: 42000, estado: "disponible" },
  { id_lote: 3, id_manzana: 1, numero_lote: "A-03", precio_lista: 35000, estado: "reservado" },
  { id_lote: 4, id_manzana: 1, numero_lote: "A-04", precio_lista: 52000, estado: "disponible" },
  { id_lote: 5, id_manzana: 1, numero_lote: "A-05", precio_lista: 35000, estado: "vendido" },
  { id_lote: 6, id_manzana: 2, numero_lote: "B-01", precio_lista: 40000, estado: "disponible" },
  { id_lote: 7, id_manzana: 2, numero_lote: "B-02", precio_lista: 46000, estado: "vendido" },
  { id_lote: 8, id_manzana: 2, numero_lote: "B-03", precio_lista: 38000, estado: "reservado" },
  { id_lote: 9, id_manzana: 2, numero_lote: "B-04", precio_lista: 40000, estado: "disponible" },
  { id_lote: 10, id_manzana: 6, numero_lote: "B-01", precio_lista: 38000, estado: "vendido" },
  { id_lote: 11, id_manzana: 6, numero_lote: "B-02", precio_lista: 44000, estado: "vendido" },
  { id_lote: 12, id_manzana: 6, numero_lote: "B-03", precio_lista: 41000, estado: "disponible" },
  { id_lote: 13, id_manzana: 6, numero_lote: "B-04", precio_lista: 36000, estado: "reservado" },
  { id_lote: 14, id_manzana: 6, numero_lote: "B-05", precio_lista: 47000, estado: "disponible" },
  { id_lote: 15, id_manzana: 9, numero_lote: "A-01", precio_lista: 45000, estado: "vendido" },
  { id_lote: 16, id_manzana: 9, numero_lote: "A-02", precio_lista: 50000, estado: "vendido" },
  { id_lote: 17, id_manzana: 9, numero_lote: "A-03", precio_lista: 42000, estado: "disponible" },
  { id_lote: 18, id_manzana: 9, numero_lote: "A-04", precio_lista: 48000, estado: "reservado" },
  { id_lote: 19, id_manzana: 15, numero_lote: "A-01", precio_lista: 65000, estado: "vendido" },
  { id_lote: 20, id_manzana: 15, numero_lote: "A-02", precio_lista: 80000, estado: "vendido" },
  { id_lote: 21, id_manzana: 15, numero_lote: "A-03", precio_lista: 58000, estado: "reservado" },
  { id_lote: 22, id_manzana: 15, numero_lote: "A-04", precio_lista: 72000, estado: "disponible" },
  { id_lote: 23, id_manzana: 15, numero_lote: "A-05", precio_lista: 62000, estado: "vendido" },
  { id_lote: 24, id_manzana: 20, numero_lote: "IND-01", precio_lista: 120000, estado: "vendido" },
  { id_lote: 25, id_manzana: 20, numero_lote: "IND-02", precio_lista: 110000, estado: "vendido" },
  { id_lote: 26, id_manzana: 20, numero_lote: "IND-03", precio_lista: 140000, estado: "disponible" },
  { id_lote: 27, id_manzana: 20, numero_lote: "IND-04", precio_lista: 115000, estado: "disponible" },
];
