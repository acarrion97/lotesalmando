import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { useAlcanceRegistros } from "./useAlcanceRegistros";

export function useCotizaciones() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { veTodosLosRegistros, filtrarPorAsesor } = useAlcanceRegistros();

  const query = useQuery({
    queryKey: ["cotizaciones", empresaId, "alcance", veTodosLosRegistros],
    queryFn: () => container.getCotizaciones.execute(empresaId),
    enabled: !!empresaId,
  });

  // Alcance de datos: sin `ver_registros_de_todos` solo se ven las cotizaciones
  // del asesor propio. (La creación usa los datos sin filtrar para no romper el
  // formulario; esto aplica al listado.)
  const data = useMemo(
    () => filtrarPorAsesor(query.data ?? []),
    [query.data, filtrarPorAsesor],
  );

  return { ...query, data };
}
