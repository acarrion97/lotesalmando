import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useUsuarios() {
  const container = getContainer();

  return useQuery({
    queryKey: ["usuarios"],
    queryFn: () => container.getUsuarios.execute(),
  });
}
