/**
 * Partner (vendedor/afiliado de la plataforma). Cada uno tiene un codigo
 * que las empresas pueden ingresar al registrarse.
 */
export interface Partnership {
  id_partner: number;
  nombre: string;
  /** Codigo unico, en mayusculas. Es el que escribe el usuario al registrarse. */
  codigo: string;
  email: string | null;
  estado: string;
  created_at: string | null;
}
