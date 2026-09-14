export interface Cobranza {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: "pendiente" | "pagada" | "vencida";
}

export const cobranzas: Cobranza[] = [
  { id_cobranza: 1, id_contrato: 1, numero_cuota: 1, monto_cuota: 1458, estado: "pagada" },
  { id_cobranza: 2, id_contrato: 1, numero_cuota: 2, monto_cuota: 1458, estado: "pagada" },
  { id_cobranza: 3, id_contrato: 1, numero_cuota: 3, monto_cuota: 1458, estado: "pagada" },
  { id_cobranza: 4, id_contrato: 1, numero_cuota: 4, monto_cuota: 1458, estado: "pendiente" },
  { id_cobranza: 5, id_contrato: 2, numero_cuota: 1, monto_cuota: 2444, estado: "pagada" },
  { id_cobranza: 6, id_contrato: 2, numero_cuota: 2, monto_cuota: 2444, estado: "pagada" },
  { id_cobranza: 7, id_contrato: 2, numero_cuota: 3, monto_cuota: 2444, estado: "pendiente" },
  { id_cobranza: 8, id_contrato: 3, numero_cuota: 1, monto_cuota: 45000, estado: "pagada" },
];
