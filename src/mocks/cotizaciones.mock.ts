export interface Cotizacion {
  id_cotizacion: number;
  id_cliente: number;
  id_lote: number;
  precio_ofertado: number;
  estado: "borrador" | "enviada" | "aceptada" | "rechazada";
}

export const cotizaciones: Cotizacion[] = [
  {
    id_cotizacion: 1,
    id_cliente: 1,
    id_lote: 2,
    precio_ofertado: 40000,
    estado: "aceptada",
  },
  {
    id_cotizacion: 2,
    id_cliente: 2,
    id_lote: 8,
    precio_ofertado: 38000,
    estado: "aceptada",
  },
  {
    id_cotizacion: 3,
    id_cliente: 3,
    id_lote: 17,
    precio_ofertado: 45000,
    estado: "aceptada",
  },
  {
    id_cotizacion: 4,
    id_cliente: 5,
    id_lote: 27,
    precio_ofertado: 110000,
    estado: "borrador",
  },
];
