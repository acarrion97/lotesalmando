import type {
  EstadisticasDashboard,
  ObtenerEstadisticasDashboard,
} from "../ports/ObtenerEstadisticasDashboard";

/**
 * KPIs del dashboard en una sola consulta.
 *
 * No agrega nada en el cliente: la agregación vive en la RPC
 * `dashboard_estadisticas` (o, en modo demo, en el puerto). Existe como
 * caso de uso para que la página no dependa directamente del puerto.
 */
export class GetEstadisticasDashboardUseCase {
  private estadisticas: ObtenerEstadisticasDashboard;
  constructor(estadisticas: ObtenerEstadisticasDashboard) {
    this.estadisticas = estadisticas;
  }

  execute(): Promise<EstadisticasDashboard> {
    return this.estadisticas.execute();
  }
}
