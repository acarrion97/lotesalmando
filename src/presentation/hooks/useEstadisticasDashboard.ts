import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

/**
 * Todos los KPIs del dashboard en UNA sola llamada a la RPC
 * `dashboard_estadisticas` (migraciones 055/056).
 *
 * Reemplaza a los 7 hooks que antes descargaban tablas completas
 * (proyectos, lotes, ventas, clientes, asesores, pagos y 20 páginas de
 * cobranzas) y agregaban los números en el cliente. El alcance por empresa
 * y por asesor lo resuelve la función en el servidor, a partir de la sesión.
 *
 * @param idProyecto Selector "Filtrar por proyecto": `null` = empresa
 *   completa; con un id, la función acota lotes, ventas, cartera y pagos a
 *   ese proyecto. Cambiarlo cambia el queryKey, así que se vuelve a consultar.
 */
export function useEstadisticasDashboard(idProyecto?: number | null) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const proyectoId = idProyecto ?? null;

  return useQuery({
    queryKey: ["estadisticasDashboard", empresaId, proyectoId],
    queryFn: () => container.getEstadisticasDashboard.execute(proyectoId),
    enabled: !!empresaId,
    // Al cambiar de proyecto se mantienen los últimos números en pantalla
    // hasta que llegan los nuevos: sin esto la página entera (incluido el
    // selector) se sustituye por un skeleton y el cambio se siente a destiempo.
    placeholderData: keepPreviousData,
  });
}
