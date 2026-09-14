import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useCobranzas() {
  const container = getContainer();

  return useQuery({
    queryKey: ["cobranzas"],
    queryFn: () => container.getCobranzas.execute(),
  });
}
