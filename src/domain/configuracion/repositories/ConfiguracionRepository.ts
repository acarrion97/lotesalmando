import type { Configuracion } from "../entities";

/** Datos editables por la empresa; `id_empresa` es la clave natural (UNIQUE). */
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
