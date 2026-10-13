import { useCallback } from "react";
import { usePermiso } from "@/presentation/providers";
import { useAsesorDeSesion } from "./useAsesorDeSesion";

interface ConAsesor {
  id_asesor: number | null;
}

/**
 * Alcance de datos del usuario con sesión.
 *
 * - `veTodosLosRegistros`: true si el permiso `ver_registros_de_todos` está
 *   presente (Administrador/Gerente). Ven toda la empresa.
 * - `idAsesorPropio`: id del asesor vinculado a la cuenta (null si no es
 *   asesor).
 * - `filtrarPorAsesor`: si el usuario NO ve todos, devuelve solo los registros
 *   cuyo `id_asesor` coincide con el suyo. Los registros sin asesor asignado
 *   se muestran solo a quien ve todos (para no filtrarles todo el historial).
 *
 * Uso en un hook de datos:
 *   const alcance = useAlcanceRegistros();
 *   const datos = alcance.filtrarPorAsesor(ventasQuery.data ?? []);
 */
export function useAlcanceRegistros() {
  const { veTodosLosRegistros } = usePermiso();
  const { idAsesor } = useAsesorDeSesion();

  const filtrarPorAsesor = useCallback(
    <T extends ConAsesor>(items: T[]): T[] => {
      if (veTodosLosRegistros) return items;
      if (idAsesor == null) return [];
      return items.filter((item) => item.id_asesor === idAsesor);
    },
    [veTodosLosRegistros, idAsesor],
  );

  return { veTodosLosRegistros, idAsesorPropio: idAsesor, filtrarPorAsesor };
}
