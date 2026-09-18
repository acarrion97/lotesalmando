import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useUsuarios() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["usuarios", empresaId],
    queryFn: () => container.getUsuarios.execute(empresaId),
    enabled: !!empresaId,
  });
}
