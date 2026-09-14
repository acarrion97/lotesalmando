export type CobranzaEstado = "pendiente" | "pagada" | "vencida";

export interface CobranzaDto {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: CobranzaEstado;
}
