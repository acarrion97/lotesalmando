import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/** Elimina un partner (sus empresas quedan sin partner asignado). */
export function useEliminarPartnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idPartner: number) => getContainer().eliminarPartnership.execute(idPartner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partnerships"] }),
  });
}
