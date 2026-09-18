import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useContratos() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["contratos", empresaId],
    queryFn: () => container.getContratos.execute(empresaId),
    enabled: !!empresaId,
  });
}
