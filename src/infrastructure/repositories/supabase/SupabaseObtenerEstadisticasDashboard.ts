import { supabase } from "@/infrastructure/supabase/client";
import type {
  EstadisticasDashboard,
  ObtenerEstadisticasDashboard,
} from "@/application/dashboard/ports/ObtenerEstadisticasDashboard";

/** Zona IANA del navegador; Postgres la usa para cortar el mes. */
function zonaHorariaDelNavegador(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** JSONB numérico -> number (0 ante null / basura, nunca NaN en la UI). */
function num(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Todas las estadísticas del dashboard en UNA llamada a la RPC
 * `dashboard_estadisticas` (migraciones 055/056), en lugar de descargar
 * proyectos + lotes + ventas + clientes + asesores + pagos y 20 páginas
 * de cobranzas.
 */
export class SupabaseObtenerEstadisticasDashboard implements ObtenerEstadisticasDashboard {
  async execute(idProyecto?: number | null): Promise<EstadisticasDashboard> {
    const { data, error } = await supabase.rpc("dashboard_estadisticas", {
      p_zona_horaria: zonaHorariaDelNavegador(),
      // null = empresa completa; con valor, el filtro lo aplica Postgres
      // sobre la cadena proyecto -> etapa -> manzana -> lote.
      p_id_proyecto: idProyecto ?? null,
    });

    if (error) throw error;
    if (!data || typeof data !== "object") {
      throw new Error("Las estadísticas del dashboard no devolvieron resultado");
    }

    const crudo = data as Record<string, unknown>;
    const lotes = (crudo.lotes ?? {}) as { total?: unknown; por_estado?: Record<string, number> };
    const ventas = (crudo.ventas ?? {}) as Record<string, unknown>;
    const cartera = (crudo.cartera ?? {}) as Record<string, unknown>;
    const pagos = (crudo.pagos ?? {}) as Record<string, unknown>;
    const porEstado = (lotes.por_estado ?? {}) as Record<string, number>;

    return {
      proyectos: Array.isArray(crudo.proyectos)
        ? (crudo.proyectos as Array<{ id_proyecto: number; nombre: string }>)
        : [],
      lotes: {
        total: num(lotes.total),
        por_estado: porEstado,
      },
      ventas: {
        mes_actual: num(ventas.mes_actual),
        mes_anterior: num(ventas.mes_anterior),
        valor_vendido: num(ventas.valor_vendido),
      },
      cartera: {
        total: num(cartera.total),
        pendiente: num(cartera.pendiente),
        pagada: num(cartera.pagada),
        vencida: num(cartera.vencida),
        monto_total: num(cartera.monto_total),
        monto_pendiente: num(cartera.monto_pendiente),
        monto_pagado: num(cartera.monto_pagado),
        monto_vencido: num(cartera.monto_vencido),
      },
      pagos: { total: num(pagos.total) },
      clientes: num(crudo.clientes),
      asesores_activos: num(crudo.asesores_activos),
      generado_en: typeof crudo.generado_en === "string" ? crudo.generado_en : "",
    };
  }
}
