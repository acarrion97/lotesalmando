/**
 * Datos legales del contrato de UN proyecto (loteo). Cada proyecto
 * puede ser una razón social distinta, así que lo que firma su
 * contrato se guarda aquí y no en la configuración de la empresa.
 *
 * Cualquier campo vacío se toma de `configuracion` (la empresa) como
 * respaldo; el RUC vacío se toma de `empresa.ruc`.
 */
export interface ConfiguracionContrato {
  id_configuracion_contrato: number;
  id_empresa: number;
  id_proyecto: number;
  /** Razón social que emite comprobantes para este proyecto. */
  razon_social?: string | null;
  /** RUC de la razón social de este proyecto. */
  ruc?: string | null;
  /** Quien firma como propietario (gerente / apoderado). */
  representante?: string | null;
  /** Cédula del representante. */
  representante_cedula?: string | null;
  /** Correo electrónico del representante. */
  representante_email?: string | null;
  /** Ciudad donde se firma el contrato. */
  ciudad?: string | null;
  /** Cuentas donde se reciben los pagos (texto libre). */
  cuentas_bancarias?: string | null;
  /** Dirección para canjear las papeletas de depósito. */
  direccion_canje?: string | null;
  /** Dirección fiscal de la matriz del emisor. */
  direccion_matriz?: string | null;
  /** Dirección fiscal del establecimiento emisor. */
  direccion_establecimiento?: string | null;
  /** Código de tres dígitos del establecimiento emisor. */
  codigo_establecimiento?: string | null;
  /** Código de tres dígitos del punto de emisión. */
  punto_emision?: string | null;
}
