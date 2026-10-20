import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { CrearEmpresaConAdminInput } from "@/domain/empresa/repositories";

/**
 * Mutación para crear una empresa nueva con su admin. Invalida la lista de
 * empresas y las métricas de plataforma para que el dashboard se refresque.
 */
export function useCreateEmpresaConAdmin() {
  const container = getContainer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CrearEmpresaConAdminInput) =>
      container.createEmpresaConAdmin.execute(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["empresas"] });
      void queryClient.invalidateQueries({ queryKey: ["plataforma"] });
    },
  });
}
