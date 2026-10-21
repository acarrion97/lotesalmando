import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";
import { type FormatoDocumentoContrato } from "@/application/contratos/ports/GeneradorDocumentoContrato";
import { descargarArchivo } from "@/utils";

/**
 * Documento de un contrato: generar uno con los datos existentes (Word o
 * PDF), anexar un archivo propio, o quitar el que hubiera. El contrato se
 * consulta por id porque la lista no trae las columnas del documento.
 */
export function useDocumentoContrato(idContrato: number | null | undefined) {
  const container = getContainer();
  const queryClient = useQueryClient();

  const contrato = useQuery({
    queryKey: ["contrato-documento", idContrato],
    queryFn: () => container.getContrato.execute(idContrato as number),
    enabled: !!idContrato,
  });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: ["contrato-documento", idContrato] });
    void queryClient.invalidateQueries({ queryKey: ["contratos"] });
  };

  const generar = useMutation({
    mutationFn: (formato: FormatoDocumentoContrato) =>
      container.generarDocumentoContrato.execute(idContrato as number, formato),
    onSuccess: () => {
      message.success("Documento generado y anexado al contrato");
      refrescar();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const anexar = useMutation({
    mutationFn: (file: File) => container.anexarDocumentoContrato.execute(idContrato as number, file),
    onSuccess: () => {
      message.success("Documento anexado");
      refrescar();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const quitar = useMutation({
    mutationFn: () => container.quitarDocumentoContrato.execute(idContrato as number),
    onSuccess: () => {
      message.success("Documento quitado del contrato");
      refrescar();
    },
    onError: (error: Error) => message.error(error.message),
  });

  /** Abre el documento en otra pestaña (URL firmada de una hora). */
  const abrir = useMutation({
    mutationFn: () => container.abrirDocumentoContrato.execute(idContrato as number),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error: Error) => message.error(error.message),
  });

  return { contrato, generar, anexar, quitar, abrir };
}

/**
 * Baja el documento de un contrato (el que generó la app o el que anexó el
 * usuario) al equipo. Se usa desde los módulos que solo ven la venta: la
 * URL firmada caduca en una hora, así que se pide en el momento de bajar.
 */
export function useDescargarDocumentoContrato() {
  const container = getContainer();

  return useMutation({
    mutationFn: (idContrato: number) => container.descargarDocumentoContrato.execute(idContrato),
    onSuccess: ({ url, nombre }) => descargarArchivo(url, nombre),
    onError: (error: Error) => message.error(error.message),
  });
}
