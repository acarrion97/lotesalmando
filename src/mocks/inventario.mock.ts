export interface Inventario {
  id_inventario: number;
  id_lote: number;
  estado_anterior: string;
  estado_nuevo: string;
  fecha_cambio: string;
  id_usuario: number;
  observacion: string;
}

export const inventario: Inventario[] = [
  {
    id_inventario: 1,
    id_lote: 1,
    estado_anterior: "disponible",
    estado_nuevo: "reservado",
    fecha_cambio: "2024-03-10",
    id_usuario: 1,
    observacion: "Reserva por cliente Carlos Mendoza",
  },
  {
    id_inventario: 2,
    id_lote: 1,
    estado_anterior: "reservado",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-03-15",
    id_usuario: 1,
    observacion: "Venta confirmada - Contrato #C-001",
  },
  {
    id_inventario: 3,
    id_lote: 7,
    estado_anterior: "disponible",
    estado_nuevo: "reservado",
    fecha_cambio: "2024-04-02",
    id_usuario: 2,
    observacion: "Reserva por cliente María Fernanda López",
  },
  {
    id_inventario: 4,
    id_lote: 7,
    estado_anterior: "reservado",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-04-10",
    id_usuario: 2,
    observacion: "Venta confirmada - Contrato #C-002",
  },
  {
    id_inventario: 5,
    id_lote: 10,
    estado_anterior: "disponible",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-05-20",
    id_usuario: 1,
    observacion: "Venta directa sin reserva previa",
  },
  {
    id_inventario: 6,
    id_lote: 15,
    estado_anterior: "disponible",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-06-01",
    id_usuario: 3,
    observacion: "Venta confirmada - Contrato #C-003",
  },
  {
    id_inventario: 7,
    id_lote: 19,
    estado_anterior: "disponible",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-06-15",
    id_usuario: 3,
    observacion: "Venta confirmada - Contrato #C-004",
  },
  {
    id_inventario: 8,
    id_lote: 24,
    estado_anterior: "disponible",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-07-01",
    id_usuario: 1,
    observacion: "Venta industrial - Contrato #C-005",
  },
  {
    id_inventario: 9,
    id_lote: 20,
    estado_anterior: "disponible",
    estado_nuevo: "vendido",
    fecha_cambio: "2024-07-10",
    id_usuario: 2,
    observacion: "Venta industrial - Contrato #C-006",
  },
];
