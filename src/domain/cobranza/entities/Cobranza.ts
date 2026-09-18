export type CobranzaEstado = "pendiente" | "pagada" | "vencida";

export interface Cobranza {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: CobranzaEstado;
  fecha_vencimiento: string;
  created_at?: string;
}
