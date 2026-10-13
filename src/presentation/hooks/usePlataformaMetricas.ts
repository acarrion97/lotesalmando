import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useUsuariosPlataforma } from "./useUsuariosPlataforma";
import type { PlataformaMetricas } from "@/application/empresa/use-cases/GetPlataformaMetricasUseCase";

/**
 * Métricas agregadas de TODA la plataforma (empresas + usuarios), para el
 * dashboard del superadmin.
 *
 * Reutiliza `useUsuariosPlataforma` (misma clave de caché) para no pedir dos
 * veces la lista de usuarios: la página que muestra el desglose por empresa y
 * esta consulta comparten el mismo resultado.
 */
export function usePlataformaMetricas() {
  const container = getContainer();
  const { data: usuarios, isLoading: cargandoUsuarios } = useUsuariosPlataforma();

  const query = useQuery<PlataformaMetricas>({
    queryKey: ["plataforma", "metricas", usuarios?.length ?? 0],
    queryFn: () => container.getPlataformaMetricas.execute(usuarios ?? []),
    // Se dispara apenas llegan los usuarios; antes no hay nada que agregar.
    enabled: usuarios !== undefined,
  });

  return {
    data: query.data,
    // Mientras no lleguen los usuarios sigue siendo "cargando" para la página.
    isLoading: cargandoUsuarios || query.isLoading,
    isError: query.isError,
  };
}
