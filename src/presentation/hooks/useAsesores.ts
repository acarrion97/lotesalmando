import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useAsesores() {
  const container = getContainer();
  return useQuery({
    queryKey: ["asesores"],
    queryFn: () => container.getAsesores.execute(),
  });
}
