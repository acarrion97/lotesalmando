export type AsesorEstado = "activo" | "inactivo";

export interface Asesor {
  id_asesor: number;
  id_empresa: number;
  id_usuario: number | null;
  codigo: string;
  nombre_comercial: string;
  meta_ventas_mensual: number;
  estado: AsesorEstado;
  created_at: string;
}
