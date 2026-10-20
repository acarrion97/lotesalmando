import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { GuardarPartnershipInput } from "@/application/partnership/use-cases/GuardarPartnershipUseCase";

export interface GuardarPartnershipVariables {
  /** null = crear un partner nuevo. */
  idPartner: number | null;
  input: GuardarPartnershipInput;
}

/** Crea o actualiza un partner desde el panel del superadmin. */
export function useGuardarPartnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idPartner, input }: GuardarPartnershipVariables) =>
      getContainer().guardarPartnership.execute(idPartner, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partnerships"] }),
  });
}
