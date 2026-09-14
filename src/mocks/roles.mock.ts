export interface Rol {
  id_rol: number;
  nombre_rol: string;
}

export const roles: Rol[] = [
  { id_rol: 1, nombre_rol: "Administrador" },
  { id_rol: 2, nombre_rol: "Vendedor" },
  { id_rol: 3, nombre_rol: "Gerente" },
];
