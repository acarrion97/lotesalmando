import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

export function useInventario() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: [...inventoryKeys.inventario(), empresaId],
    queryFn: () => container.getInventario.execute(empresaId),
    enabled: !!empresaId,
  });
}
