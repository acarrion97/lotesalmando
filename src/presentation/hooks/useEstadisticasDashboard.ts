import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

/**
 * Todos los KPIs del dashboard en UNA sola llamada a la RPC
 * `dashboard_estadisticas` (migración 055).
 *
 * Reemplaza a los 7 hooks que antes descargaban tablas completas
 * (proyectos, lotes, ventas, clientes, asesores, pagos y 20 páginas de
 * cobranzas) y agregaban los números en el cliente. El alcance por empresa
 * y por asesor lo resuelve la función en el servidor, a partir de la sesión.
 */
export function useEstadisticasDashboard() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["estadisticasDashboard", empresaId],
    queryFn: () => container.getEstadisticasDashboard.execute(),
    enabled: !!empresaId,
  });
}
