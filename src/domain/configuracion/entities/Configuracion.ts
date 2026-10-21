export interface Configuracion {
  id_configuracion: number;
  id_empresa: number;
  moneda: string | null;
  idioma: string | null;
  /** Nombre de quien representa a la empresa en el contrato. */
  representante?: string | null;
  /** Cédula del representante de la empresa. */
  representante_cedula?: string | null;
  /** Correo electrónico del representante de la empresa. */
  representante_email?: string | null;
  /** Ciudad donde se firma el contrato. */
  ciudad?: string | null;
  /** Cuentas donde se reciben los pagos (texto libre). */
  cuentas_bancarias?: string | null;
  /** Dirección para canjear las papeletas de depósito por recibos. */
  direccion_canje?: string | null;
}
