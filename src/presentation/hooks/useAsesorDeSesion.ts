import { useAsesores } from "./useAsesores";
import { useAuth } from "@/presentation/providers";

/**
 * El asesor vinculado a la cuenta con sesión activa, si lo tiene y está
 * activo. Es el que se registra por defecto en cotizaciones, prospectos y
 * ventas directas; `null` cuando la cuenta no es asesor.
 */
export function useAsesorDeSesion() {
  const { data: asesores, isLoading } = useAsesores();
  const { user } = useAuth();

  const asesor =
    asesores?.find((a) => a.id_usuario === user?.id_usuario && a.estado === "activo") ?? null;

  return {
    asesor,
    idAsesor: asesor?.id_asesor ?? null,
    isLoading,
  };
}
