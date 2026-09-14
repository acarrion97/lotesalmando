import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useVentas() {
  const container = getContainer();

  return useQuery({
    queryKey: ["ventas"],
    queryFn: () => container.getVentas.execute(),
  });
}
