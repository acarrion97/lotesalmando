import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function usePagos() {
  const container = getContainer();

  return useQuery({
    queryKey: ["pagos"],
    queryFn: () => container.getPagos.execute(),
  });
}
