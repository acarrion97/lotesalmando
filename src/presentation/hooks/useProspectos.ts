import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useProspectos() {
  const container = getContainer();
  return useQuery({
    queryKey: ["prospectos"],
    queryFn: () => container.getProspectos.execute(),
  });
}
