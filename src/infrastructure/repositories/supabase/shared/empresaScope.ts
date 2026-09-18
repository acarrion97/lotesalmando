import { supabase } from "@/infrastructure/supabase/client";

/**
 * Walks the empresa -> proyecto -> etapa -> manzana -> lote -> venta ->
 * contrato -> cobranza chain to scope Supabase queries by tenant. Several
 * tables (ventas, contratos, cobranzas, pagos, cliente) have no id_empresa
 * column of their own, so tenant scoping has to be derived through their
 * foreign keys instead.
 */
async function idsFrom(
  table: string,
  column: string,
  filterColumn: string,
  filterValues: number[]
): Promise<number[]> {
  if (filterValues.length === 0) return [];
  const { data, error } = await supabase.from(table).select(column).in(filterColumn, filterValues);
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, number>[]).map((row) => row[column]);
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
