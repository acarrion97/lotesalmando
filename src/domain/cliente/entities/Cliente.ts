export interface Cliente {
  id_cliente: number;
  /**
   * Empresa a la que pertenece el cliente (019). Los clientes antiguos pueden
   * no tenerla si no tenían ventas, cotizaciones ni un prospecto con su email:
   * en ese caso no aparecen en el listado por empresa.
   */
  id_empresa: number | null;
  nombres: string;
  cedula_ruc: string;
  email: string;
  /** Contacto adicional; los clientes antiguos pueden no tenerlo. */
  telefono: string | null;
}
