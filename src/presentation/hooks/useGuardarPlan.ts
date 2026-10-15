import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { GuardarPlanInput } from "@/application/plan/use-cases/GuardarPlanUseCase";

export interface GuardarPlanVariables {
  /** null = crear un plan nuevo. */
  idPlan: number | null;
  input: GuardarPlanInput;
  /** Imagen que tenia el plan antes de editar (para borrarla si se reemplaza). */
  imagenAnteriorUrl?: string | null;
}

/** Crea o actualiza un plan desde el panel del superadmin. */
export function useGuardarPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idPlan, input, imagenAnteriorUrl }: GuardarPlanVariables) =>
      getContainer().guardarPlan.execute(idPlan, input, imagenAnteriorUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planes"] }),
  });
}
