import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useManzanasByEtapa(etapaId: number) {
  const container = getContainer();

  return useQuery({
    queryKey: ["manzanas", "etapa", etapaId],
    queryFn: () => container.getManzanasByEtapa.execute(etapaId),
    enabled: !!etapaId,
  });
}
