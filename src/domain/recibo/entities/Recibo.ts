export type ReciboIdentificacionTipo = "04" | "05" | "07";
/**
 * Formas de pago que acepta el SRI. `no_especificada` existe solo para los
 * pagos registrados antes de pedir la forma de pago (la tabla `pagos` usa
 * ese valor por defecto); la confirmación normal nunca la envía.
 */
export type FormaPago =
  | "efectivo"
  | "transferencia"
  | "deposito"
  | "tarjeta"
  | "cheque"
  | "otro"
  | "no_especificada";

export interface Recibo {
  id_recibo: number;
  id_empresa: number;
  id_proyecto: number;
  id_pago: number;
  id_cobranza: number;
  numero_recibo: string;
  secuencia: number;
  fecha_emision: string;
  emisor_razon_social: string;
  emisor_ruc: string;
  emisor_direccion_matriz: string;
  emisor_direccion_establecimiento: string;
  codigo_establecimiento: string;
  punto_emision: string;
  receptor_nombre: string;
  receptor_tipo_identificacion: ReciboIdentificacionTipo;
  receptor_identificacion: string;
  detalle: string;
  subtotal: number;
  porcentaje_iva: 15;
  iva: number;
  total: number;
  forma_pago: FormaPago;
  created_at: string;
}
