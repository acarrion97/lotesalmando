import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useManzanas() {
  const container = getContainer();

  return useQuery({
    queryKey: ["manzanas"],
    queryFn: () => container.getAllManzanas.execute(),
  });
}
