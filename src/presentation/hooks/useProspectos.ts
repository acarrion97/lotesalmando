import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { useAlcanceRegistros } from "./useAlcanceRegistros";

export function useProspectos() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { veTodosLosRegistros, filtrarPorAsesor } = useAlcanceRegistros();

  const query = useQuery({
    queryKey: ["prospectos", empresaId, "alcance", veTodosLosRegistros],
    queryFn: () => container.getProspectos.execute(empresaId),
    enabled: !!empresaId,
  });

  // Alcance de datos: sin `ver_registros_de_todos` solo se ven los prospectos
  // del asesor propio.
  const data = useMemo(
    () => filtrarPorAsesor(query.data ?? []),
    [query.data, filtrarPorAsesor],
  );

  return { ...query, data };
}
