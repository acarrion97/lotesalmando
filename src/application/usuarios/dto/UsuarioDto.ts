export type UsuarioEstado = "activo" | "inactivo";

export interface UsuarioDto {
  id_usuario: number;
  id_empresa: number;
  nombres: string;
  email: string;
  estado: UsuarioEstado;
  /** Fecha de registro en la plataforma (migración 026). */
  created_at?: string | null;
}
