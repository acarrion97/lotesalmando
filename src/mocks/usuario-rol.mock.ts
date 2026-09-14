export interface UsuarioRol {
  id_usuario_rol: number;
  id_usuario: number;
  id_rol: number;
  id_empresa: number;
  fecha_asignacion: string;
}

export const usuarioRoles: UsuarioRol[] = [
  // Constructora del Norte
  {
    id_usuario_rol: 1,
    id_usuario: 1,
    id_rol: 1, // Administrador
    id_empresa: 1,
    fecha_asignacion: "2023-02-01",
  },
  {
    id_usuario_rol: 2,
    id_usuario: 2,
    id_rol: 2, // Vendedor
    id_empresa: 1,
    fecha_asignacion: "2023-03-15",
  },
  // Inmobiliaria Sur
  {
    id_usuario_rol: 3,
    id_usuario: 3,
    id_rol: 3, // Gerente
    id_empresa: 2,
    fecha_asignacion: "2023-04-20",
  },
  {
    id_usuario_rol: 4,
    id_usuario: 4,
    id_rol: 2, // Vendedor
    id_empresa: 2,
    fecha_asignacion: "2023-05-10",
  },
];
