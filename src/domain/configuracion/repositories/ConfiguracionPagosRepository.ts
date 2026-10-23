import type { ConfiguracionPagos } from "../entities";

/** Datos fiscales de los recibos de pago de un proyecto (upsert por proyecto). */
export interface SaveConfiguracionPagosInput {
  id_empresa: number;
  id_proyecto: number;
  razon_social?: string | null;
  direccion_matriz?: string | null;
  direccion_establecimiento?: string | null;
  codigo_establecimiento?: string | null;
  punto_emision?: string | null;
}

export interface ConfiguracionPagosRepository {
  /** Configuración de pagos del proyecto, o `null` si nadie la cargó todavía. */
  getByProyectoId(idProyecto: number): Promise<ConfiguracionPagos | null>;
  /** Crea la fila si no existe; la actualiza si ya existe (upsert). */
  save(data: SaveConfiguracionPagosInput): Promise<ConfiguracionPagos>;
}
