export interface Empresa {
  id_empresa: number;
  razon_social: string;
  ruc: string;
  estado: string;
  /** Fecha de registro en la plataforma (la agrega la migración 026). */
  created_at?: string | null;
}
