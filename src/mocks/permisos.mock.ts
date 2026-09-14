export interface Permiso {
  id_permiso: number;
  nombre_permiso: string;
  modulo: string;
}

export const permisos: Permiso[] = [
  { id_permiso: 1, nombre_permiso: "crear_proyectos", modulo: "proyectos" },
  { id_permiso: 2, nombre_permiso: "editar_proyectos", modulo: "proyectos" },
  { id_permiso: 3, nombre_permiso: "eliminar_proyectos", modulo: "proyectos" },
  { id_permiso: 4, nombre_permiso: "ver_proyectos", modulo: "proyectos" },
  { id_permiso: 5, nombre_permiso: "crear_lotes", modulo: "lotes" },
  { id_permiso: 6, nombre_permiso: "editar_lotes", modulo: "lotes" },
  { id_permiso: 7, nombre_permiso: "cambiar_estado_lotes", modulo: "lotes" },
  { id_permiso: 8, nombre_permiso: "crear_ventas", modulo: "ventas" },
  { id_permiso: 9, nombre_permiso: "aprobar_ventas", modulo: "ventas" },
  { id_permiso: 10, nombre_permiso: "anular_ventas", modulo: "ventas" },
  { id_permiso: 11, nombre_permiso: "crear_clientes", modulo: "clientes" },
  { id_permiso: 12, nombre_permiso: "editar_clientes", modulo: "clientes" },
  { id_permiso: 13, nombre_permiso: "ver_clientes", modulo: "clientes" },
  { id_permiso: 14, nombre_permiso: "ver_cobranzas", modulo: "cobranzas" },
  { id_permiso: 15, nombre_permiso: "registrar_pago", modulo: "cobranzas" },
  { id_permiso: 16, nombre_permiso: "ver_pagos", modulo: "pagos" },
  { id_permiso: 17, nombre_permiso: "confirmar_pagos", modulo: "pagos" },
  { id_permiso: 18, nombre_permiso: "ver_reportes", modulo: "reportes" },
  { id_permiso: 19, nombre_permiso: "exportar_reportes", modulo: "reportes" },
  { id_permiso: 20, nombre_permiso: "editar_configuracion", modulo: "configuracion" },
];
