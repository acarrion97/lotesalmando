import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/**
 * Datos legales del contrato de un proyecto (configuración por proyecto).
 * `null` cuando nadie los cargó todavía: entonces el contrato usa la
 * configuración de la empresa como respaldo.
 */
export function useConfiguracionContrato(idProyecto: number | null) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.configuracionContrato(empresaId, idProyecto ?? 0),
    queryFn: () => container.getConfiguracionContrato.execute(idProyecto as number),
    enabled: !!empresaId && !!idProyecto,
  });
}
