import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useProyectos() {
  const container = getContainer();

  return useQuery({
    queryKey: ["proyectos"],
    queryFn: () => container.getProyectos.execute(),
  });
}
