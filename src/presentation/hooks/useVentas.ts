import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { useAlcanceRegistros } from "./useAlcanceRegistros";
import { inventoryKeys } from "./inventoryKeys";

export function useVentas() {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { veTodosLosRegistros, filtrarPorAsesor } = useAlcanceRegistros();

  const query = useQuery({
    queryKey: [...inventoryKeys.ventas(empresaId), "alcance", veTodosLosRegistros],
    queryFn: () => container.getVentas.execute(empresaId),
    enabled: !!empresaId,
  });

  // Alcance de datos: un usuario sin `ver_registros_de_todos` solo ve las
  // ventas de su propio asesor. Se filtra en el cliente porque el backend no
  // distingue por asesor todavía.
  const data = useMemo(
    () => filtrarPorAsesor(query.data ?? []),
    [query.data, filtrarPorAsesor],
  );

  return { ...query, data };
}
