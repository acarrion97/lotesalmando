export interface Venta {
  id_venta: number;
  id_cliente: number;
  id_lote: number;
  id_cotizacion: number;
  id_usuario: number;
  precio_final: number;
  estado: "pendiente" | "completada" | "cancelada";
}

export const ventas: Venta[] = [
  {
    id_venta: 1,
    id_cliente: 1,
    id_lote: 1,
    id_cotizacion: 1,
    id_usuario: 1,
    precio_final: 35000,
    estado: "completada",
  },
  {
    id_venta: 2,
    id_cliente: 2,
    id_lote: 7,
    id_cotizacion: 2,
    id_usuario: 2,
    precio_final: 44000,
    estado: "completada",
  },
  {
    id_venta: 3,
    id_cliente: 3,
    id_lote: 15,
    id_cotizacion: 3,
    id_usuario: 3,
    precio_final: 45000,
    estado: "completada",
  },
];
