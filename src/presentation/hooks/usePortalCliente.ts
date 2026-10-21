import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";

/**
 * Estado del portal del cliente (`/portal-cliente`): el visitante escribe
 * su cédula y ve sus cuotas, y puede enviar el comprobante de una cuota.
 * No hay sesión de por medio: todo pasa por RPCs públicas (migración 035).
 */
export function usePortalCliente() {
  const container = getContainer();
  const [cedula, setCedula] = useState("");

  const consulta = useMutation({
    mutationFn: (valor: string) => container.consultarPortalCliente.execute(valor),
    onSuccess: (datos) => {
      if (!datos.existe) {
        message.warning("No encontramos ninguna cuenta con esa cédula");
      }
    },
    onError: () => message.error("No se pudo consultar. Probá de nuevo en unos segundos."),
  });

  const enviarComprobante = useMutation({
    mutationFn: (input: { idCobranza: number; montoPagado: number; file: File }) =>
      container.registrarComprobantePortal.execute({
        cedula: cedula.trim(),
        ...input,
      }),
    onSuccess: (resultado) => {
      if (resultado.ok) {
        message.success(resultado.mensaje);
      } else {
        message.error(resultado.mensaje);
      }
    },
    onError: () => message.error("No se pudo enviar el comprobante. Probá de nuevo."),
  });

  return { cedula, setCedula, consulta, enviarComprobante };
}
