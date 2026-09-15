export interface Actividad {
  id_actividad: number;
  id_prospecto: number;
  id_usuario: number | null;
  tipo: string;
  descripcion: string;
  fecha_actividad: string;
  created_at: string;
}
