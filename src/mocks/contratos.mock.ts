export interface Contrato {
  id_contrato: number;
  id_venta: number;
  numero_contrato: string;
  monto_total: number;
}

export const contratos: Contrato[] = [
  {
    id_contrato: 1,
    id_venta: 1,
    numero_contrato: "C-2024-001",
    monto_total: 35000,
  },
  {
    id_contrato: 2,
    id_venta: 2,
    numero_contrato: "C-2024-002",
    monto_total: 44000,
  },
  {
    id_contrato: 3,
    id_venta: 3,
    numero_contrato: "C-2024-003",
    monto_total: 45000,
  },
];
