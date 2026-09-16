import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useRoles() {
  const container = getContainer();

  return useQuery({
    queryKey: ["roles"],
    queryFn: () => container.getRoles.execute(),
  });
}
