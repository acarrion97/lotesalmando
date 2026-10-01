import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { AceptarCotizacionCommand } from "@/application/cotizaciones/ports/AceptarCotizacionPort";

/**
 * Acepta una cotización: la RPC crea venta, lote vendido, inventario,
 * contrato y cuotas en una sola transacción. Al terminar se refrescan todos
 * los módulos que la venta toca (spec `cotizaciones/aceptacion`, escenario
 * "Reflejo en los módulos").
 */
export function useAceptarCotizacion() {
  const queryClient = useQueryClient();
  const container = getContainer();

  return useMutation({
    mutationFn: (command: AceptarCotizacionCommand) => container.aceptarCotizacion.execute(command),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ventas"] }),
        queryClient.invalidateQueries({ queryKey: ["lotes"] }),
        queryClient.invalidateQueries({ queryKey: ["inventario"] }),
        queryClient.invalidateQueries({ queryKey: ["contratos"] }),
        queryClient.invalidateQueries({ queryKey: ["cobranzas"] }),
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] }),
        queryClient.invalidateQueries({ queryKey: ["clientes"] }),
        queryClient.invalidateQueries({ queryKey: ["mapa"] }),
      ]);
    },
  });
}
