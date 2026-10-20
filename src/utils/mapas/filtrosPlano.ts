import type { LoteEstado } from "@/domain/lote/entities";

/**
 * Filtros de disponibilidad del plano público (cambio
 * improve-public-lotization-map).
 *
 * Los conteos se calculan aquí, sobre los lotes ya cargados, y no desde el
 * bloque `estadisticas` de la RPC: ese bloque solo agrega disponibles,
 * reservados y vendidos, y con los seis estados reales su suma puede no
 * cuadrar con el total de lotes del plano.
 */

/** Los seis estados comerciales que puede tener un lote. */
export const ESTADOS_PLANO = [
  "disponible",
  "reservado",
  "vendido",
  "en_negociacion",
  "bloqueado",
  "no_disponible",
] as const satisfies readonly LoteEstado[];

export type EstadoPlano = (typeof ESTADOS_PLANO)[number];

/**
 * Filtro activo en la pestaña Mapa. `"todos"` significa sin filtro: la leyenda
 * se queda sin ítem activo y el plano se ve completo.
 */
export type FiltroDisponibilidad = EstadoPlano | "todos";

/** Lo mínimo que hace falta de un lote para filtrarlo o contarlo. */
export interface LoteFiltrable {
  id_lote: number;
  estado: LoteEstado;
  poligono?: readonly unknown[] | null | undefined;
}

/** Un lote solo entra en el plano si su contorno está completo. */
export function tieneContorno(lote: LoteFiltrable): boolean {
  return !!lote.poligono && lote.poligono.length >= 3;
}

/**
 * Conteo por estado de los lotes con contorno, con los seis estados siempre
 * presentes. La suma de los valores es el número de lotes dibujados.
 */
export function contarPorEstado(lotes: readonly LoteFiltrable[]): Record<EstadoPlano, number> {
  const conteo = Object.fromEntries(ESTADOS_PLANO.map((e) => [e, 0])) as Record<
    EstadoPlano,
    number
  >;
  for (const lote of lotes) {
    if (!tieneContorno(lote)) continue;
    conteo[lote.estado] = (conteo[lote.estado] ?? 0) + 1;
  }
  return conteo;
}

/**
 * Identificadores de los lotes incluidos por el filtro, listos para pasárselos
 * como `resaltados` al visor. Devuelve `null` con `"todos"`, que es el contrato
 * de esa propiedad: sin conjunto no se atenúa nada.
 */
export function idsFiltradosPorEstado(
  lotes: readonly LoteFiltrable[],
  filtro: FiltroDisponibilidad,
): ReadonlySet<number> | null {
  if (filtro === "todos") return null;
  const ids = new Set<number>();
  for (const lote of lotes) {
    if (!tieneContorno(lote)) continue;
    if (lote.estado === filtro) ids.add(lote.id_lote);
  }
  return ids;
}
