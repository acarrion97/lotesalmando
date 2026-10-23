export interface Configuracion {
  id_configuracion: number;
  id_empresa: number;
  moneda: string | null;
  idioma: string | null;
  /** URL pública del logo de la empresa almacenado en Supabase Storage. */
  logo_url?: string | null;
  // Los datos legales del contrato (representante, ciudad, cuentas,
  // dirección de canje) NO viven acá: cada proyecto carga los suyos en
  // `configuracion_contrato` (migraciones 038 y 045).
}
