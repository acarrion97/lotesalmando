import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useCarteraMetricas() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["carteraMetricas", empresaId],
    queryFn: () => container.getCarteraMetricas.execute(empresaId),
    enabled: !!empresaId,
  });
}
