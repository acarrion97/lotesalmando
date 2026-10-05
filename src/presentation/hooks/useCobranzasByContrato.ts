import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";

export function useCobranzasByContrato(contratoId: number | null | undefined) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["cobranzas", empresaId, "contrato", contratoId ?? 0],
    queryFn: () => container.getCobranzasByContrato.execute(contratoId as number),
    enabled: !!empresaId && !!contratoId,
  });
}
