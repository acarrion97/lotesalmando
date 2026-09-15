export type VentaEstado = "pendiente" | "completada" | "cancelada";

export interface Venta {
  id_venta: number;
  id_cliente: number;
  id_lote: number;
  id_cotizacion: number;
  id_usuario: number;
  precio_final: number;
  estado: VentaEstado;
  created_at?: string;
}
