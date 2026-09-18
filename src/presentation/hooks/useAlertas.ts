import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useAlertas() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["alertas", empresaId],
    queryFn: () => container.generarAlertas.execute(undefined, empresaId),
    enabled: !!empresaId,
    refetchInterval: 60000,
  });
}
