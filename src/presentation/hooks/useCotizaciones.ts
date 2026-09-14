import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useCotizaciones() {
  const container = getContainer();

  return useQuery({
    queryKey: ["cotizaciones"],
    queryFn: () => container.getCotizaciones.execute(),
  });
}
