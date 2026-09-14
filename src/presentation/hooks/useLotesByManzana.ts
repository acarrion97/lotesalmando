import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useLotesByManzana(manzanaId: number) {
  const container = getContainer();

  return useQuery({
    queryKey: ["lotes", "manzana", manzanaId],
    queryFn: () => container.getLotesByManzana.execute(manzanaId),
    enabled: !!manzanaId,
  });
}
