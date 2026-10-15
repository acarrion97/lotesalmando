export interface Empresa {
  id_empresa: number;
  razon_social: string;
  ruc: string;
  estado: string;
  /** Fecha de registro en la plataforma (la agrega la migración 026). */
  created_at?: string | null;
  /** Plan de pago elegido al registrarse ('basico' | 'inicial' | 'avanzado'). */
  plan: string | null;
  /** Partner (vendedor de la plataforma) con cuyo codigo se registro. FK a partnership. */
  id_partner: number | null;
}
