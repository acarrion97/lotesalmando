import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { CreateSaleCommand } from "@/application/ventas/ports/CreateSaleTransaction";

export function useCreateVenta() {
  const queryClient = useQueryClient();
  const container = getContainer();

  return useMutation({
    mutationFn: (command: CreateSaleCommand) =>
      container.createVenta.execute(command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
      // a venta is registered together with its cotizacion and cliente
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
