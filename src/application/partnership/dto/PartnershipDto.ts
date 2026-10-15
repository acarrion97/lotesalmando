export interface PartnershipDto {
  id_partner: number;
  nombre: string;
  /** Codigo unico, en mayusculas. */
  codigo: string;
  email: string | null;
  estado: string;
  created_at: string | null;
}
