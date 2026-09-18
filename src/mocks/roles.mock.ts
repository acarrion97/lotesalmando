import type { Rol } from "@/domain/rol/entities";

export const roles: Rol[] = [
  { id_rol: 1, nombre_rol: "Administrador" },
  { id_rol: 2, nombre_rol: "Vendedor" },
  { id_rol: 3, nombre_rol: "Gerente" },
];

export const usuarioRolAsignaciones: { id_usuario: number; id_rol: number }[] = [];
