import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/** Configuración (moneda/idioma) de la empresa activa. `null` si aún no existe. */
export function useConfiguracion() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.configuracion(empresaId),
    queryFn: () => container.getConfiguracion.execute(empresaId),
    enabled: !!empresaId,
  });
}
