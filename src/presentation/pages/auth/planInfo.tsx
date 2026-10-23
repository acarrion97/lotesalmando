import type { ReactNode } from "react";
import {
  CrownOutlined,
  DatabaseOutlined,
  RocketOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UngroupOutlined,
} from "@ant-design/icons";
import type { PlanDto } from "@/application/plan/dto/PlanDto";

/**
 * Helpers visuales compartidos por las paginas publicas de registro:
 * /registro/planes (elegir plan), /registro/agente (lista de planes
 * "unicos" con pago directo, junto al formulario) y /registro/<clave>
 * (pagina propia de cada plan unico).
 */

/**
 * Planes "unicos": los que tienen `plan.es_unico = true` en la BD (lo
 * decide el superadmin desde /planes). Cada uno se vende por su pagina
 * /registro/<clave> con pago directo al checkout (/registro/agente los
 * lista todos juntos), y no se listan en /registro/planes.
 */
export function planesUnicos(planes: PlanDto[] | undefined | null): PlanDto[] {
  return (planes ?? []).filter((p) => p.activo && p.es_unico);
}

export const PLAN_ICONS: Record<string, ReactNode> = {
  basico: <ThunderboltOutlined />,
  inicial: <RocketOutlined />,
  avanzado: <CrownOutlined />,
  agente: <TeamOutlined />,
};

/** Icono por tipo de limite (fallback: el de la clave del plan). */
export function iconoDePlan(clave: string): ReactNode {
  return PLAN_ICONS[clave] ?? <ThunderboltOutlined />;
}

/** Lineas de limites del plan para la tarjeta. Vacio si no tiene limites. */
export function limitesDePlan(plan: PlanDto): { icono: ReactNode; texto: string }[] {
  const items: { icono: ReactNode; texto: string }[] = [];
  if (plan.max_proyectos != null) {
    items.push({
      icono: <UngroupOutlined />,
      texto: plan.max_proyectos === 1 ? "1 proyecto" : `Hasta ${plan.max_proyectos} proyectos`,
    });
  }
  if (plan.max_lotes_por_proyecto != null) {
    items.push({
      icono: <DatabaseOutlined />,
      texto:
        plan.max_lotes_por_proyecto === 1
          ? "1 lote por proyecto"
          : `Hasta ${plan.max_lotes_por_proyecto} lotes por proyecto`,
    });
  }
  if (plan.max_usuarios != null) {
    items.push({
      icono: <TeamOutlined />,
      texto: plan.max_usuarios === 1 ? "1 usuario" : `${plan.max_usuarios} usuarios`,
    });
  }
  return items;
}

/** "USD 53" / "USD 89.50" - el precio tal como se muestra en /planes. */
export function precioFormateado(precio: number): string {
  return `USD ${Number.isInteger(precio) ? precio : precio.toFixed(2)}`;
}
