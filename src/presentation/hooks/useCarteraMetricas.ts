import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useCarteraMetricas() {
  const container = getContainer();
  return useQuery({
    queryKey: ["carteraMetricas"],
    queryFn: () => container.getCarteraMetricas.execute(),
  });
}
