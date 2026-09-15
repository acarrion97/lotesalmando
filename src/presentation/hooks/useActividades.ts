import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useActividades(prospectoId: number) {
  const container = getContainer();
  return useQuery({
    queryKey: ["actividades", prospectoId],
    queryFn: () => container.getActividades.execute(prospectoId),
    enabled: !!prospectoId,
  });
}
