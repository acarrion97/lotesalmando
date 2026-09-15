export type AlertaTipo = "inventario" | "seguimiento" | "cartera" | "mora";
export type AlertaPrioridad = "alta" | "media" | "baja";

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  prioridad: AlertaPrioridad;
  titulo: string;
  descripcion: string;
  entidad_tipo?: string;
  entidad_id?: number;
  created_at: string;
  leida: boolean;
}
