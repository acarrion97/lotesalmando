import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";
import { supabase } from "@/infrastructure/supabase/client";
import { useEmpresa } from "@/presentation/providers";
import { useAuth } from "@/presentation/providers/AuthProvider";

/**
 * Le avisa al cliente el resultado de la revisión (correo con el motivo si
 * se rechazó). Es best effort: si el endpoint falla, no existe aún en el
 * entorno o el correo no se puede mandar, la revisión ya quedó hecha y no
 * se le avisa al asesor.
 */
async function avisarResultadoRevision(idComprobante: number): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/comprobantes/avisar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ idComprobante }),
    });
  } catch (error) {
    console.warn("[comprobantes] no se pudo avisar el resultado al cliente:", error);
  }
}

/**
 * Comprobantes que los clientes enviaron desde el portal público, de la
 * empresa de la sesión. Se usa en Clientes (revisión) y en Cobranzas.
 */
export function useComprobantes() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["comprobantes", empresaId],
    queryFn: () => container.getComprobantes.execute(empresaId),
    enabled: !!empresaId,
  });
}

/**
 * Aprueba o rechaza un comprobante. Aprobar también registra el pago y
 * pasa la cuota a `pagada`, así que refresca todo lo que muestre cuotas.
 */
export function useRevisionComprobante() {
  const container = getContainer();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const idUsuario = user?.id_usuario ?? 0;

  const refrescar = () =>
    queryClient.invalidateQueries({
      predicate: (q) =>
        q.queryKey.some((k) =>
          typeof k === "string" && ["comprobantes", "cobranzas", "pagos", "ventas"].includes(k),
        ),
    });

  const aprobar = useMutation({
    mutationFn: (id: number) => container.aprobarComprobante.execute(id, idUsuario),
    onSuccess: (revisado) => {
      message.success("Comprobante aprobado: el pago quedó registrado");
      void refrescar();
      void avisarResultadoRevision(revisado.id_comprobante);
    },
    onError: (error: Error) => message.error(error.message),
  });

  const rechazar = useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string | null }) =>
      container.rechazarComprobante.execute(id, idUsuario, nota),
    onSuccess: (revisado) => {
      message.success("Comprobante rechazado: el cliente lo verá en su portal");
      void refrescar();
      void avisarResultadoRevision(revisado.id_comprobante);
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { aprobar, rechazar };
}
