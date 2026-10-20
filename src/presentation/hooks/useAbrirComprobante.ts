import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";

/**
 * Abre el archivo que subió el cliente (URL firmada de una hora, porque el
 * bucket `comprobantes` es privado).
 */
export function useAbrirComprobante() {
  const container = getContainer();

  return useMutation({
    mutationFn: (id: number) => container.abrirComprobante.execute(id),
    onError: (error: Error) => message.error(error.message),
  });
}
