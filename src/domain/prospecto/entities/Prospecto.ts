export type ProspectoEstado = "nuevo" | "contactado" | "interesado" | "negociacion" | "reserva" | "perdido";

export interface Prospecto {
  id_prospecto: number;
  id_empresa: number;
  id_asesor: number | null;
  nombres: string;
  email: string;
  telefono: string;
  origen: string;
  estado: ProspectoEstado;
  notas: string;
  fecha_ultimo_seguimiento: string | null;
  created_at: string;
}
