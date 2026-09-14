export type UsuarioEstado = "activo" | "inactivo";

export interface Usuario {
  id_usuario: number;
  id_empresa: number;
  nombres: string;
  email: string;
  estado: UsuarioEstado;
}
