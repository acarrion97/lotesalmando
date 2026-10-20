import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/** Entradas (señas) cobradas al reservar, del scope de la empresa actual. */
export function useEntradasReserva() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.entradasReserva(empresaId),
    queryFn: () => container.getEntradasReserva.execute(empresaId),
    enabled: !!empresaId,
  });
}
