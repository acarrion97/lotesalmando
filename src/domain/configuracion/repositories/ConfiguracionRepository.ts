import type { Configuracion } from "../entities";

/** Datos editables por la empresa; `id_empresa` es la clave natural (UNIQUE). */
export interface SaveConfiguracionInput {
  id_empresa: number;
  moneda: string;
  idioma: string;
  /** Datos legales que usa el contrato (representante, ciudad, cuentas). */
  representante?: string | null;
  representante_cedula?: string | null;
  representante_email?: string | null;
  ciudad?: string | null;
  cuentas_bancarias?: string | null;
  direccion_canje?: string | null;
}

export interface ConfiguracionRepository {
  /** Devuelve la configuración de la empresa, o `null` si aún no existe. */
  getByEmpresaId(empresaId: number): Promise<Configuracion | null>;
  /** Crea la configuración si no existe; la actualiza si ya existe (upsert). */
  save(data: SaveConfiguracionInput): Promise<Configuracion>;
}
