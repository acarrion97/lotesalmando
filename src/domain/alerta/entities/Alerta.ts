export type AlertaTipo =  "seguimiento" | "cartera" | "mora" | "comprobante";
export type AlertaPrioridad = "alta" | "media" | "baja";

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  prioridad: AlertaPrioridad;
  titulo: string;
  descripcion: string;
  /** Lineas de detalle opcionales (ej. un cliente por linea). */
  detalle?: string[];
  entidad_tipo?: string;
  entidad_id?: number;
  created_at: string;
  leida: boolean;
}
