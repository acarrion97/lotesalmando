import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useEtapas() {
  const container = getContainer();

  return useQuery({
    queryKey: ["etapas"],
    queryFn: () => container.getAllEtapas.execute(),
  });
}
