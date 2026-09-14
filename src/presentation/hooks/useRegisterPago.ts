import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

interface RegisterPagoData {
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
}

export function useRegisterPago() {
  const queryClient = useQueryClient();
  const container = getContainer();

  return useMutation({
    mutationFn: (data: RegisterPagoData) =>
      container.registerPago.execute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
    },
  });
}
