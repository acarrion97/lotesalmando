import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { getContainer } from "@/infrastructure/container";
import type { DocumentoProspectoTipo } from "@/domain/portalProspecto/entities";

/**
 * Avisa al asesor por correo que llego documentacion nueva. Es best effort:
 * si el endpoint falla todavia no existe en el entorno o el correo no se
 * puede mandar, el documento ya quedo registrado y se revisa igualmente.
 */
async function avisarAlAsesor(slug: string, email: string): Promise<void> {
  try {
    await fetch("/api/prospectos/avisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email }),
    });
  } catch {
    // Nunca romper el envio del documento por un aviso que no llego.
  }
}

/**
 * Estado del portal de prospectos (`/portal-prospecto/:slug`): el
 * visitante escribe su email, ve la checklist de documentación legal y
 * envía cada archivo. No hay sesión de por medio: todo pasa por RPCs
 * públicas (migración 044).
 */
export function usePortalProspecto(slug: string) {
  const container = getContainer();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [emailConsultado, setEmailConsultado] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["portalProspecto", slug, emailConsultado],
    queryFn: () => container.consultarPortalProspecto.execute(slug, emailConsultado ?? ""),
    enabled: !!emailConsultado,
    retry: false,
  });

  const buscar = (valor: string) => {
    const limpio = valor.trim();
    if (!limpio) return;
    setEmailConsultado(limpio);
  };

  const refetch = () => consulta.refetch();

  /** Vuelve al paso 1 (otro email) y descarta la consulta anterior. */
  const reiniciar = () => {
    setEmailConsultado(null);
    setEmail("");
    queryClient.removeQueries({ queryKey: ["portalProspecto", slug] });
  };

  const iniciar = useMutation({
    mutationFn: (datos: { email: string; nombres: string; telefono: string }) =>
      container.iniciarProspectoPortal.execute({ slug, ...datos }),
    onError: () => message.error("No se pudo registrar. Probá de nuevo en unos segundos."),
  });

  const enviar = useMutation({
    mutationFn: (input: {
      idProspecto: number;
      tipo: DocumentoProspectoTipo;
      file: File;
    }) =>
      container.registrarDocumentoPortal.execute({
        email: emailConsultado ?? "",
        ...input,
      }),
    onSuccess: (resultado) => {
      if (resultado.ok) {
        message.success(resultado.mensaje);
        // La checklist se pinta con los datos frescos de la base.
        void queryClient.invalidateQueries({ queryKey: ["portalProspecto", slug] });
        // Aviso al asesor (best effort, maximo uno por dia del lado del server).
        void avisarAlAsesor(slug, emailConsultado ?? "");
      } else {
        message.error(resultado.mensaje);
      }
    },
    onError: () => message.error("No se pudo enviar el documento. Probá de nuevo."),
  });

  return { email, setEmail, emailConsultado, buscar, reiniciar, consulta, iniciar, enviar, refetch };
}
