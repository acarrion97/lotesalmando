import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export function useCancelarReserva() {
  const queryClient = useQueryClient();
  const container = getContainer();

  return useMutation({
    mutationFn: ({ loteId, usuarioId }: { loteId: number; usuarioId: number }) =>
      container.cancelarReserva.execute(loteId, usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
    },
  });
}
