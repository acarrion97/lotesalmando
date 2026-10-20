import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

export interface EliminarPlanVariables {
  idPlan: number;
  imagenUrl?: string | null;
}

/** Elimina un plan (y su imagen, mejor esfuerzo). */
export function useEliminarPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idPlan, imagenUrl }: EliminarPlanVariables) =>
      getContainer().eliminarPlan.execute(idPlan, imagenUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planes"] }),
  });
}
