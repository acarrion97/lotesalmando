import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

export function useEtapas() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.etapas(empresaId),
    queryFn: () => container.getAllEtapas.execute(empresaId),
    enabled: !!empresaId,
  });
}
