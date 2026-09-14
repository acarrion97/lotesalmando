export interface Pago {
  id_pago: number;
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
}

export const pagos: Pago[] = [
  {
    id_pago: 1,
    id_cobranza: 1,
    id_usuario: 1,
    monto_pagado: 1458,
    fecha_pago: "2024-04-15",
  },
  {
    id_pago: 2,
    id_cobranza: 2,
    id_usuario: 1,
    monto_pagado: 1458,
    fecha_pago: "2024-05-20",
  },
  {
    id_pago: 3,
    id_cobranza: 5,
    id_usuario: 2,
    monto_pagado: 2444,
    fecha_pago: "2024-05-10",
  },
  {
    id_pago: 4,
    id_cobranza: 8,
    id_usuario: 3,
    monto_pagado: 45000,
    fecha_pago: "2024-06-03",
  },
];
