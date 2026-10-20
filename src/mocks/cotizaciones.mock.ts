export interface Cotizacion {
  id_cotizacion: number;
  id_cliente: number;
  id_lote: number;
  precio_ofertado: number;
  estado: "borrador" | "enviada" | "aceptada" | "rechazada";
  id_asesor: number | null;
  monto_entrada: number;
  num_cuotas: number;
}

export const cotizaciones: Cotizacion[] = [
  {
    id_cotizacion: 1,
    id_cliente: 1,
    id_lote: 2,
    precio_ofertado: 40000,
    estado: "aceptada",
    id_asesor: 1,
    monto_entrada: 5000,
    num_cuotas: 12,
  },
  {
    id_cotizacion: 2,
    id_cliente: 2,
    id_lote: 8,
    precio_ofertado: 38000,
    estado: "aceptada",
    id_asesor: 1,
    monto_entrada: 0,
    num_cuotas: 12,
  },
  {
    id_cotizacion: 3,
    id_cliente: 3,
    id_lote: 17,
    precio_ofertado: 45000,
    estado: "aceptada",
    id_asesor: null,
    monto_entrada: 10000,
    num_cuotas: 24,
  },
  {
    id_cotizacion: 4,
    id_cliente: 5,
    id_lote: 27,
    precio_ofertado: 110000,
    estado: "borrador",
    id_asesor: 1,
    monto_entrada: 20000,
    num_cuotas: 36,
  },
];
