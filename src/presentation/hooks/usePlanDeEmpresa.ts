import { useMemo } from "react";
import { useEmpresa } from "@/presentation/providers";
import { usePlanes } from "./usePlanes";

export interface PlanDeEmpresa {
  /** Clave del plan de la empresa (empresa.plan). null si no tiene plan. */
  clave: string | null;
  nombre: string | null;
  /** Limites del plan. null = sin limite (tambien si no hay plan asignado). */
  max_proyectos: number | null;
  max_lotes_por_proyecto: number | null;
  max_usuarios: number | null;
}

/**
 * Limites del plan que tiene asignada la empresa actual. Una empresa sin
 * plan (o con limites NULL) queda sin limite: el corte real lo pone la BD
 * (triggers de la migracion 028) y aca solo se usa para avisar antes.
 */
export function usePlanDeEmpresa(): PlanDeEmpresa {
  const { empresaActual } = useEmpresa();
  const { data: planes } = usePlanes();

  return useMemo(() => {
    const clave = empresaActual?.plan ?? null;
    const plan = clave ? (planes ?? []).find((p) => p.clave === clave && p.activo) : undefined;
    return {
      clave,
      nombre: plan?.nombre ?? null,
      max_proyectos: plan?.max_proyectos ?? null,
      max_lotes_por_proyecto: plan?.max_lotes_por_proyecto ?? null,
      max_usuarios: plan?.max_usuarios ?? null,
    };
  }, [empresaActual?.plan, planes]);
}
