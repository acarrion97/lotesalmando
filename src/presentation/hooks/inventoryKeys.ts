/**
 * Tenant-aware query key factory for inventory data (proyectos, etapas,
 * manzanas, lotes, mapa). `empresaId` is a required parameter so a key can
 * never be built without it — this is the structural guard that
 * `offline/tenant-isolation` depends on before persistence is added.
 */
export const inventoryKeys = {
  proyectos: (empresaId: number) => ["proyectos", empresaId] as const,
  etapas: (empresaId: number) => ["etapas", empresaId] as const,
  etapasByProyecto: (empresaId: number, proyectoId: number) =>
    ["etapas", empresaId, "proyecto", proyectoId] as const,
  manzanas: (empresaId: number) => ["manzanas", empresaId] as const,
  manzanasByEtapa: (empresaId: number, etapaId: number) =>
    ["manzanas", empresaId, "etapa", etapaId] as const,
  lotes: (empresaId: number) => ["lotes", empresaId] as const,
  lotesByManzana: (empresaId: number, manzanaId: number) =>
    ["lotes", empresaId, "manzana", manzanaId] as const,
};
