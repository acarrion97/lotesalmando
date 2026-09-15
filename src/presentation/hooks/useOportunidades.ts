import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useOportunidades() {
  const container = getContainer();
  return useQuery({
    queryKey: ["oportunidades"],
    queryFn: () => container.getOportunidades.execute(),
  });
}
