import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

interface SeleccionarPlanParams {
  idEmpresa: number;
  plan: string;
}

/** Guarda el plan de pago elegido por la empresa (columna `empresa.plan`). */
export function useSeleccionarPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idEmpresa, plan }: SeleccionarPlanParams) =>
      getContainer().updateEmpresaPlan.execute(idEmpresa, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["empresas"] }),
  });
}
