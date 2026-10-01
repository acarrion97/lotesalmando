/**
 * Tenant-aware query key factory. `empresaId` is a required parameter so a
 * key can never be built without it — this is the structural guard that
 * `offline/tenant-isolation` depends on for the inventory domains
 * (proyectos, etapas, manzanas, lotes) that are eligible for offline
 * persistence; the other domains reuse the same shape purely so their
 * query cache is correctly scoped per empresa.
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
  inventario: () => ["inventario"] as const,
  ventas: (empresaId: number) => ["ventas", empresaId] as const,
  cobranzas: (empresaId: number) => ["cobranzas", empresaId] as const,
  pagos: (empresaId: number) => ["pagos", empresaId] as const,
  asesores: (empresaId: number) => ["asesores", empresaId] as const,
  configuracion: (empresaId: number) => ["configuracion", empresaId] as const,
  /** Plano (imagen) de un proyecto; nunca es elegible para persistencia offline. */
  mapaByProyecto: (empresaId: number, proyectoId: number) =>
    ["mapa", empresaId, proyectoId] as const,
  /** Lotes del proyecto con su contorno sobre el plano. */
  lotesPlano: (empresaId: number, proyectoId: number) =>
    ["mapa", empresaId, proyectoId, "lotes"] as const,
  /** Fotos y videos del proyecto (galería pública). */
  mediosProyecto: (empresaId: number, proyectoId: number) =>
    ["medios", empresaId, proyectoId] as const,
};
