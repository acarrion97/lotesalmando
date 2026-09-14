import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useClientes(empresaId: number) {
  const container = getContainer();

  return useQuery({
    queryKey: ["clientes", empresaId],
    queryFn: () => container.getClientes.execute(empresaId),
    enabled: !!empresaId,
  });
}
