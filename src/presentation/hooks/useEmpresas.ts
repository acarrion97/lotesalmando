import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useEmpresas(options?: { enabled?: boolean }) {
  const container = getContainer();

  return useQuery({
    queryKey: ["empresas"],
    queryFn: () => container.getEmpresas.execute(),
    enabled: options?.enabled ?? true,
  });
}
