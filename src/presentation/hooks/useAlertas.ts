import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useAlertas() {
  const container = getContainer();
  return useQuery({
    queryKey: ["alertas"],
    queryFn: () => container.generarAlertas.execute(),
    refetchInterval: 60000,
  });
}
