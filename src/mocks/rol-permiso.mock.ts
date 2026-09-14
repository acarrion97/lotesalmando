export interface RolPermiso {
  id_rol_permiso: number;
  id_rol: number;
  id_permiso: number;
}

export const rolPermisos: RolPermiso[] = [
  // Administrador - Todos los permisos
  { id_rol_permiso: 1, id_rol: 1, id_permiso: 1 },
  { id_rol_permiso: 2, id_rol: 1, id_permiso: 2 },
  { id_rol_permiso: 3, id_rol: 1, id_permiso: 3 },
  { id_rol_permiso: 4, id_rol: 1, id_permiso: 4 },
  { id_rol_permiso: 5, id_rol: 1, id_permiso: 5 },
  { id_rol_permiso: 6, id_rol: 1, id_permiso: 6 },
  { id_rol_permiso: 7, id_rol: 1, id_permiso: 7 },
  { id_rol_permiso: 8, id_rol: 1, id_permiso: 8 },
  { id_rol_permiso: 9, id_rol: 1, id_permiso: 9 },
  { id_rol_permiso: 10, id_rol: 1, id_permiso: 10 },
  { id_rol_permiso: 11, id_rol: 1, id_permiso: 11 },
  { id_rol_permiso: 12, id_rol: 1, id_permiso: 12 },
  { id_rol_permiso: 13, id_rol: 1, id_permiso: 13 },
  { id_rol_permiso: 14, id_rol: 1, id_permiso: 14 },
  { id_rol_permiso: 15, id_rol: 1, id_permiso: 15 },
  { id_rol_permiso: 16, id_rol: 1, id_permiso: 16 },
  { id_rol_permiso: 17, id_rol: 1, id_permiso: 17 },
  { id_rol_permiso: 18, id_rol: 1, id_permiso: 18 },
  { id_rol_permiso: 19, id_rol: 1, id_permiso: 19 },
  { id_rol_permiso: 20, id_rol: 1, id_permiso: 20 },

  // Vendedor - Permisos de operación
  { id_rol_permiso: 21, id_rol: 2, id_permiso: 4 },  // ver proyectos
  { id_rol_permiso: 22, id_rol: 2, id_permiso: 7 },  // cambiar estado lotes
  { id_rol_permiso: 23, id_rol: 2, id_permiso: 8 },  // crear ventas
  { id_rol_permiso: 24, id_rol: 2, id_permiso: 11 }, // crear clientes
  { id_rol_permiso: 25, id_rol: 2, id_permiso: 12 }, // editar clientes
  { id_rol_permiso: 26, id_rol: 2, id_permiso: 13 }, // ver clientes
  { id_rol_permiso: 27, id_rol: 2, id_permiso: 14 }, // ver cobranzas
  { id_rol_permiso: 28, id_rol: 2, id_permiso: 15 }, // registrar pago
  { id_rol_permiso: 29, id_rol: 2, id_permiso: 16 }, // ver pagos
  { id_rol_permiso: 30, id_rol: 2, id_permiso: 18 }, // ver reportes

  // Gerente - Permisos de supervisión
  { id_rol_permiso: 31, id_rol: 3, id_permiso: 1 },  // crear proyectos
  { id_rol_permiso: 32, id_rol: 3, id_permiso: 2 },  // editar proyectos
  { id_rol_permiso: 33, id_rol: 3, id_permiso: 4 },  // ver proyectos
  { id_rol_permiso: 34, id_rol: 3, id_permiso: 5 },  // crear lotes
  { id_rol_permiso: 35, id_rol: 3, id_permiso: 6 },  // editar lotes
  { id_rol_permiso: 36, id_rol: 3, id_permiso: 7 },  // cambiar estado lotes
  { id_rol_permiso: 37, id_rol: 3, id_permiso: 8 },  // crear ventas
  { id_rol_permiso: 38, id_rol: 3, id_permiso: 9 },  // aprobar ventas
  { id_rol_permiso: 39, id_rol: 3, id_permiso: 10 }, // anular ventas
  { id_rol_permiso: 40, id_rol: 3, id_permiso: 11 }, // crear clientes
  { id_rol_permiso: 41, id_rol: 3, id_permiso: 12 }, // editar clientes
  { id_rol_permiso: 42, id_rol: 3, id_permiso: 13 }, // ver clientes
  { id_rol_permiso: 43, id_rol: 3, id_permiso: 14 }, // ver cobranzas
  { id_rol_permiso: 44, id_rol: 3, id_permiso: 15 }, // registrar pago
  { id_rol_permiso: 45, id_rol: 3, id_permiso: 16 }, // ver pagos
  { id_rol_permiso: 46, id_rol: 3, id_permiso: 17 }, // confirmar pagos
  { id_rol_permiso: 47, id_rol: 3, id_permiso: 18 }, // ver reportes
  { id_rol_permiso: 48, id_rol: 3, id_permiso: 19 }, // exportar reportes
];
