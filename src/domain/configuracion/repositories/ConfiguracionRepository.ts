import type { Configuracion } from "../entities";

/**
 * Preferencias de la empresa (`id_empresa` es la clave natural, UNIQUE).
 *
 * Los datos legales del contrato (representante, cédula, correo, ciudad,
 * cuentas, dirección de canje) ya NO se cargan acá: se editan por proyecto
 * desde Contratos → Configuración (`configuracion_contrato`). Sus columnas
 * en `configuracion` quedan sólo como respaldo de lectura para los
 * contratos, y por eso este input ya no las incluye: guardar no las toca.
 */
export interface SaveConfiguracionInput {
  id_empresa: number;
  moneda: string;
  idioma: string;
}

export interface ConfiguracionRepository {
  /** Devuelve la configuración de la empresa, o `null` si aún no existe. */
  getByEmpresaId(empresaId: number): Promise<Configuracion | null>;
  /** Crea la configuración si no existe; la actualiza si ya existe (upsert). */
  save(data: SaveConfiguracionInput): Promise<Configuracion>;
}
