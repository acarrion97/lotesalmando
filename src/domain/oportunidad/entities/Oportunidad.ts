export type OportunidadEtapa = "contactado" | "interesado" | "negociacion" | "reserva" | "perdido";

export interface Oportunidad {
  id_oportunidad: number;
  id_empresa: number;
  id_prospecto: number;
  id_lote: number | null;
  etapa: OportunidadEtapa;
  valor_estimado: number;
  notas: string;
  /**
   * Snapshot del cliente capturado al reservar (etapa `reserva`). Reservar NO
   * crea `cliente`: estos datos se guardan aquí y se copian a `cliente` recién
   * al vender. Solo se llenan en la etapa `reserva`; en las demás son null.
   */
  cliente_nombres?: string | null;
  cliente_cedula_ruc?: string | null;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
  created_at: string;
}
