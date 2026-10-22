import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "./inventoryKeys";

export function useLogoByEmpresa(empresaId: number) {
  const container = getContainer();

  return useQuery({
    queryKey: inventoryKeys.logoEmpresa(empresaId),
    queryFn: async () => (await container.getConfiguracion.execute(empresaId))?.logo_url ?? null,
    enabled: !!empresaId,
  });
}
