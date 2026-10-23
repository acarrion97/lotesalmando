import type { ConfiguracionContrato } from "../entities";

/** Datos legales del contrato de un proyecto (upsert por proyecto). */
export interface SaveConfiguracionContratoInput {
  id_empresa: number;
  id_proyecto: number;
  ruc?: string | null;
  representante?: string | null;
  representante_cedula?: string | null;
  representante_email?: string | null;
  ciudad?: string | null;
  cuentas_bancarias?: string | null;
  direccion_canje?: string | null;
}

export interface ConfiguracionContratoRepository {
  /** Configuración del proyecto, o `null` si nadie la cargó todavía. */
  getByProyectoId(idProyecto: number): Promise<ConfiguracionContrato | null>;
  /** Crea la fila si no existe; la actualiza si ya existe (upsert). */
  save(data: SaveConfiguracionContratoInput): Promise<ConfiguracionContrato>;
}
