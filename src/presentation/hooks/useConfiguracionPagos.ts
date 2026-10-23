import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/**
 * Datos fiscales de los recibos de pago de un proyecto (configuración
 * por proyecto, desde Cobranzas/Pagos). `null` cuando nadie los cargó
 * todavía: entonces el recibo toma razón social y RUC de la empresa.
 */
export function useConfiguracionPagos(idProyecto: number | null) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.configuracionPagos(empresaId, idProyecto ?? 0),
    queryFn: () => container.getConfiguracionPagos.execute(idProyecto as number),
    enabled: !!empresaId && !!idProyecto,
  });
}
