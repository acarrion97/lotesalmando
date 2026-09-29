import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useReservarLote() {
  const queryClient = useQueryClient();
  const container = getContainer();

  return useMutation({
    mutationFn: ({ loteId, usuarioId }: { loteId: number; usuarioId: number }) =>
      container.reservarLote.execute(loteId, usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
