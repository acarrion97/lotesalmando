import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useLotes() {
  const container = getContainer();

  return useQuery({
    queryKey: ["lotes"],
    queryFn: () => container.getLotes.execute(),
  });
}
