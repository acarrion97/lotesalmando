export type UsuarioEstado = "activo" | "inactivo";

export interface Usuario {
  id_usuario: number;
  id_empresa: number;
  nombres: string;
  email: string;
  estado: UsuarioEstado;
  /**
   * Vencimiento de la contraseña temporal que otorga el panel al crear la
   * cuenta (ver passwordDeEmail). NULL = sin vencimiento: la persona ya
   * definió su propia contraseña.
   */
  password_temporal_hasta?: string | null;
  /** Fecha de registro en la plataforma (la agrega la migración 026). */
  created_at?: string | null;
}
