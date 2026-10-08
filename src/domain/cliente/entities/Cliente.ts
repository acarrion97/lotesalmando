export interface Cliente {
  id_cliente: number;
  nombres: string;
  cedula_ruc: string;
  email: string;
  /** Contacto adicional; los clientes antiguos pueden no tenerlo. */
  telefono: string | null;
}
