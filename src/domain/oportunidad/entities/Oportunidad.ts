export type OportunidadEtapa = "contactado" | "interesado" | "negociacion" | "reserva" | "perdido";

export interface Oportunidad {
  id_oportunidad: number;
  id_empresa: number;
  id_prospecto: number;
  id_lote: number | null;
  etapa: OportunidadEtapa;
  valor_estimado: number;
  notas: string;
  created_at: string;
}
