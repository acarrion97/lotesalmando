import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/** Catalogo de partners (vendedores de la plataforma). */
export function usePartnerships() {
  return useQuery({
    queryKey: ["partnerships"],
    queryFn: () => getContainer().getPartnerships.execute(),
    staleTime: 1000 * 60 * 5,
  });
}
