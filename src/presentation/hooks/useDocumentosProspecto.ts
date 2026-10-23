import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { useAuth } from "@/presentation/providers/AuthProvider";

/**
 * Documentación enviada desde el portal público, de la empresa de la
 * sesión: se revisa en Prospectos → Documentación.
 */
export function useDocumentosProspecto() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["documentosProspecto", empresaId],
    queryFn: () => container.getDocumentosProspecto.execute(empresaId),
    enabled: !!empresaId,
  });
}

/** URL firmada (1 h) para ver el archivo privado en la revisión. */
export function useAbrirDocumentoProspecto() {
  const container = getContainer();
  return useMutation({
    mutationFn: (idDocumento: number) => container.abrirDocumentoProspecto.execute(idDocumento),
  });
}

/**
 * Aprueba o rechaza un documento. El rechazo exige observación (lo
 * valida el caso de uso) y el prospecto la verá en su portal para
 * poder reenviar el archivo corregido.
 */
export function useRevisionDocumentoProspecto() {
  const container = getContainer();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const idUsuario = user?.id_usuario ?? 0;

  const refrescar = () =>
    queryClient.invalidateQueries({
      predicate: (q) =>
        q.queryKey.some(
          (k) => typeof k === "string" && ["documentosProspecto", "portalProspecto"].includes(k),
        ),
    });

  const aprobar = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      container.revisarDocumentoProspecto.execute(id, idUsuario, "aprobado", null),
    onSuccess: () => {
      message.success("Documento aprobado: el prospecto lo verá en su portal");
      void refrescar();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const rechazar = useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string | null }) =>
      container.revisarDocumentoProspecto.execute(id, idUsuario, "rechazado", nota),
    onSuccess: () => {
      message.success("Documento rechazado: el prospecto verá tu observación");
      void refrescar();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { aprobar, rechazar };
}
