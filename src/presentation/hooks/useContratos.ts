import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useContratos() {
  const container = getContainer();
  return useQuery({
    queryKey: ["contratos"],
    queryFn: () => container.getContratos.execute(),
  });
}
