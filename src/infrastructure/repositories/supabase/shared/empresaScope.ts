import { supabase } from "@/infrastructure/supabase/client";

/**
 * Walks the empresa -> proyecto -> etapa -> manzana -> lote -> venta ->
 * contrato -> cobranza chain to scope Supabase queries by tenant. Several
 * tables (ventas, contratos, cobranzas, pagos, cliente) have no id_empresa
 * column of their own, so tenant scoping has to be derived through their
 * foreign keys instead.
 *
 * Dos limites de PostgREST mandan cómo se leen listas largas:
 *   - cada respuesta corta en 1000 filas (ojo: la empresa ya pasa de eso
 *     en cobranzas, que son 24 filas por contrato);
 *   - la URL acepta ~8 KB, así que un `.in()` con miles de ids responde
 *     414 y se pierde la consulta entera.
 * Por eso `idsFrom` pagina y `leerPorIds` pagina *y* corta los ids.
 */

/** Filas por petición (tope de PostgREST). */
const FILAS_POR_PAGINA = 1000;
/** Ids por bloque dentro de un `.in()` (muy por debajo del límite de URL). */
const IDS_POR_BLOQUE = 500;

/** La lista de ids, partida en bloques seguros para un `.in()`. */
export function bloquesDeIds(ids: number[]): number[][] {
  const bloques: number[][] = [];
  for (let i = 0; i < ids.length; i += IDS_POR_BLOQUE) {
    bloques.push(ids.slice(i, i + IDS_POR_BLOQUE));
  }
  return bloques;
}

/**
 * Filas de una tabla filtradas por ids, sin tragarse ninguno de los dos
 * límites: los ids viajan en bloques y cada bloque se lee por páginas con
 * un orden estable (si no, la paginación repite o salta filas).
 */
export async function leerPorIds(
  tabla: string,
  columnaFiltro: string,
  ids: number[],
  opciones?: {
    /** Columna por la que ordenar; por defecto la del filtro. */
    orden?: string;
    ascendente?: boolean;
    /** Selección de columnas; por defecto todas. */
    seleccion?: string;
  },
): Promise<Record<string, unknown>[]> {
  const filas: Record<string, unknown>[] = [];
  if (ids.length === 0) return filas;

  for (const bloque of bloquesDeIds(ids)) {
    for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
      const { data, error } = await supabase
        .from(tabla)
        .select(opciones?.seleccion ?? "*")
        .in(columnaFiltro, bloque)
        .order(opciones?.orden ?? columnaFiltro, {
          ascending: opciones?.ascendente ?? true,
        })
        .range(desde, desde + FILAS_POR_PAGINA - 1);
      if (error) throw error;
      // `tabla`/`seleccion` no son literales: el cliente sin tipos devuelve
      // una firma genérica, se castea a filas comunes.
      const pagina = (data ?? []) as unknown as Record<string, unknown>[];
      filas.push(...pagina);
      if (pagina.length < FILAS_POR_PAGINA) break;
    }
  }
  return filas;
}

async function idsFrom(
  table: string,
  column: string,
  filterColumn: string,
  filterValues: number[]
): Promise<number[]> {
  if (filterValues.length === 0) return [];

  const ids: number[] = [];
  for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .in(filterColumn, filterValues)
      // Orden estable: sin él, dos páginas pueden repetir o dejar afuera
      // la misma fila y los ids de la empresa quedarían incompletos.
      .order(column)
      .range(desde, desde + FILAS_POR_PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as unknown as Record<string, number>[];
    ids.push(...pagina.map((fila) => fila[column]));
    if (pagina.length < FILAS_POR_PAGINA) break;
  }
  return ids;
}

export async function getProyectoIdsForEmpresa(empresaId: number): Promise<number[]> {
  const { data, error } = await supabase.from("proyectos").select("id_proyecto").eq("id_empresa", empresaId);
  if (error) throw error;
  return (data ?? []).map((row) => row.id_proyecto as number);
}

export async function getEtapaIdsForEmpresa(empresaId: number): Promise<number[]> {
  const proyectoIds = await getProyectoIdsForEmpresa(empresaId);
  return idsFrom("etapas", "id_etapa", "id_proyecto", proyectoIds);
}

export async function getManzanaIdsForEmpresa(empresaId: number): Promise<number[]> {
  const etapaIds = await getEtapaIdsForEmpresa(empresaId);
  return idsFrom("manzana_bloque", "id_manzana", "id_etapa", etapaIds);
}

export async function getLoteIdsForEmpresa(empresaId: number): Promise<number[]> {
  const manzanaIds = await getManzanaIdsForEmpresa(empresaId);
  return idsFrom("lotes", "id_lote", "id_manzana", manzanaIds);
}

export async function getVentaIdsForEmpresa(empresaId: number): Promise<number[]> {
  const loteIds = await getLoteIdsForEmpresa(empresaId);
  return idsFrom("ventas", "id_venta", "id_lote", loteIds);
}

export async function getContratoIdsForEmpresa(empresaId: number): Promise<number[]> {
  const ventaIds = await getVentaIdsForEmpresa(empresaId);
  return idsFrom("contratos", "id_contrato", "id_venta", ventaIds);
}

export async function getCobranzaIdsForEmpresa(empresaId: number): Promise<number[]> {
  const contratoIds = await getContratoIdsForEmpresa(empresaId);
  return idsFrom("cobranzas", "id_cobranza", "id_contrato", contratoIds);
}
