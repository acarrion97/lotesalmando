import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type {
  RegistrarInteresPublicoCommand,
  RegistroInteresResult,
} from "@/application/prospectos/ports/RegistrarInteresPublicoPort";

/**
 * Registra el interés de un visitante del mapa público: la RPC crea (o reusa
 * por email) el prospecto y la oportunidad del lote en una sola transacción,
 * sin sesión. No reserva el lote; al terminar se refresca el CRM para que el
 * prospecto aparezca en el módulo Prospectos.
 */
export function useRegistrarInteresPublico() {
  const container = getContainer();
  const queryClient = useQueryClient();

  return useMutation<RegistroInteresResult, Error, RegistrarInteresPublicoCommand>({
    mutationFn: (command) => container.registrarInteresPublico.execute(command),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["prospectos"] }),
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] }),
      ]);
    },
  });
}
