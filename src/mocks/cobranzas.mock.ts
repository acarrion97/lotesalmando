export interface Cobranza {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: "pendiente" | "pagada" | "vencida";
  fecha_vencimiento: string;
}

function diasDesdeHoy(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export const cobranzas: Cobranza[] = [
  { id_cobranza: 1, id_contrato: 1, numero_cuota: 1, monto_cuota: 1458, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-90) },
  { id_cobranza: 2, id_contrato: 1, numero_cuota: 2, monto_cuota: 1458, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-60) },
  { id_cobranza: 3, id_contrato: 1, numero_cuota: 3, monto_cuota: 1458, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-30) },
  { id_cobranza: 4, id_contrato: 1, numero_cuota: 4, monto_cuota: 1458, estado: "pendiente", fecha_vencimiento: diasDesdeHoy(-3) },
  { id_cobranza: 5, id_contrato: 2, numero_cuota: 1, monto_cuota: 2444, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-30) },
  { id_cobranza: 6, id_contrato: 2, numero_cuota: 2, monto_cuota: 2444, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-1) },
  { id_cobranza: 7, id_contrato: 2, numero_cuota: 3, monto_cuota: 2444, estado: "pendiente", fecha_vencimiento: diasDesdeHoy(5) },
  { id_cobranza: 8, id_contrato: 3, numero_cuota: 1, monto_cuota: 45000, estado: "pagada", fecha_vencimiento: diasDesdeHoy(-15) },
];
