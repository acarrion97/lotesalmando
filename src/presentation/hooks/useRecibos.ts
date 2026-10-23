import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "./inventoryKeys";
import { useEmpresa } from "@/presentation/providers";

/**
 * Recibos ya emitidos para un conjunto de pagos. Se usa en el historial de
 * pagos y en las cuotas para saber qué pagos tienen respaldo imprimible. Un
 * pago sin recibo (por ejemplo, registrado antes de este cambio) simplemente
 * no aparece acá y su acción de recibo queda indisponible: nunca se fabrica
 * un recibo al vuelo.
 */
export function useRecibosPorPagos(idsPago: number[]) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  // Ordenar para que la clave no cambie si el llamador reordena el array.
  const clave = [...idsPago].sort((a, b) => a - b);

  return useQuery({
    queryKey: [...inventoryKeys.pagos(empresaId), "recibos", clave.join(",")],
    queryFn: () => container.getRecibos.execute(clave),
    enabled: empresaId > 0 && clave.length > 0,
  });
}

/**
 * Descarga el PDF del recibo de un pago. El PDF se arma en el navegador a
 * partir del snapshot persistido, con el mismo número de secuencia: la
 * reimprenta no reserva ninguno nuevo.
 */
export function useDescargarRecibo() {
  const container = getContainer();

  return useMutation({
    mutationFn: (idPago: number) => container.descargarRecibo.execute(idPago),
    onSuccess: ({ blob, nombre }) => descargarBlob(blob, nombre),
    onError: (error: Error) => message.error(error.message),
  });
}

/** Baja un Blob generado en el navegador con el nombre indicado. */
function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
