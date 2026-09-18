import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useCotizaciones() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["cotizaciones", empresaId],
    queryFn: () => container.getCotizaciones.execute(empresaId),
    enabled: !!empresaId,
  });
}
