import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useOportunidades() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["oportunidades", empresaId],
    queryFn: () => container.getOportunidades.execute(empresaId),
    enabled: !!empresaId,
  });
}
