export interface EmpresaDto {
  id_empresa: number;
  razon_social: string;
  ruc: string;
  estado: string;
  /** Plan de pago elegido al registrarse ('basico' | 'inicial' | 'avanzado'). */
  plan: string | null;
}
