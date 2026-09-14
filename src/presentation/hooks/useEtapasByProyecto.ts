import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useEtapasByProyecto(proyectoId: number) {
  const container = getContainer();

  return useQuery({
    queryKey: ["etapas", "proyecto", proyectoId],
    queryFn: () => container.getEtapasByProyecto.execute(proyectoId),
    enabled: !!proyectoId,
  });
}
