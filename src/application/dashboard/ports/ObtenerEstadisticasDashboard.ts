/** KPIs del dashboard ("Centro de Mando") ya agregados por la base de datos. */
export interface EstadisticasDashboard {
  /** Lista mínima para el selector "Filtrar por proyecto" de la página. */
  proyectos: Array<{ id_proyecto: number; nombre: string }>;
  lotes: {
    /** Total de lotes de la empresa (todos los estados). */
    total: number;
    /** Conteo por estado; las claves ausentes se leen como 0. */
    por_estado: Record<string, number>;
  };
  ventas: {
    /** Ventas realizadas (completadas o pendientes) del mes actual. */
    mes_actual: number;
    /** Mismo conteo del mes anterior, para el % de variación. */
    mes_anterior: number;
    /** Suma de `precio_final` de todas las ventas realizadas. */
    valor_vendido: number;
  };
  cartera: {
    total: number;
    pendiente: number;
    pagada: number;
    vencida: number;
    monto_total: number;
    monto_pendiente: number;
    monto_pagado: number;
    monto_vencido: number;
  };
  pagos: {
    /** Suma de `monto_pagado` de los pagos de la empresa. */
    total: number;
  };
  clientes: number;
  asesores_activos: number;
  /** Momento en que Postgres calculó los KPIs (depuración/cache). */
  generado_en: string;
}

/**
 * Puerto de infraestructura: todos los KPIs del dashboard en UNA sola
 * llamada (RPC `dashboard_estadisticas`, migración 055).
 *
 * Reemplaza a los 7 hooks que antes descargaban tablas completas
 * (cobranzas paginadas 20 veces) y agregaban en JavaScript. El alcance por
 * empresa y por asesor lo resuelve la función a partir de la sesión, no el
 * cliente.
 *
 * En producción lo implementa la RPC; en modo demo la replica calculando
 * sobre los repositorios en memoria con las mismas fórmulas.
 */
export interface ObtenerEstadisticasDashboard {
  /**
   * @param idProyecto `null` / `undefined` = empresa completa; con un id,
   *   solo los KPI de ese proyecto (lotes, ventas, cartera y pagos). El
   *   filtro lo aplica la función en el servidor: el cliente no descarga
   *   filas de más. `proyectos`, `clientes` y `asesores` no se filtran.
   */
  execute(idProyecto?: number | null): Promise<EstadisticasDashboard>;
}
