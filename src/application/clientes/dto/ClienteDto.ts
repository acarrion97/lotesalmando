export interface ClienteDto {
  id_cliente: number;
  /** Empresa del cliente (migración 019); null en los pocos sin dueño. */
  id_empresa: number | null;
  nombres: string;
  cedula_ruc: string;
  email: string;
  telefono: string | null;
}
