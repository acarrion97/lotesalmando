import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { MAP_OFFLINE_CACHE_TTL_MS } from "@/infrastructure/offline/offlineDataPolicy";

interface OpcionesEmpresas {
  enabled?: boolean;
}

export function useEmpresas(
  empresaIdOrOptions: number | OpcionesEmpresas = {},
  opciones?: OpcionesEmpresas,
) {
  const container = getContainer();
  const empresaId = typeof empresaIdOrOptions === "number" ? empresaIdOrOptions : null;
  const opcionesConsulta = typeof empresaIdOrOptions === "number" ? opciones : empresaIdOrOptions;

  return useQuery({
    queryKey: empresaId ? (["empresas", empresaId] as const) : (["empresas"] as const),
    queryFn: async () => {
      const empresas = await container.getEmpresas.execute();
      return empresaId ? empresas.filter((empresa) => empresa.id_empresa === empresaId) : empresas;
    },
    enabled: (opcionesConsulta?.enabled ?? true) && (empresaId === null || empresaId > 0),
    ...(empresaId ? { gcTime: MAP_OFFLINE_CACHE_TTL_MS } : {}),
  });
}
