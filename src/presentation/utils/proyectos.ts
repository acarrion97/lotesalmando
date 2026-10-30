export interface LoteProyecto {
  id_lote: number;
  id_manzana: number;
}

export interface ManzanaProyecto {
  id_manzana: number;
  id_etapa: number;
}

export interface EtapaProyecto {
  id_etapa: number;
  id_proyecto: number;
}

export function crearMapaProyectoPorLote(
  lotes: readonly LoteProyecto[] | undefined,
  manzanas: readonly ManzanaProyecto[] | undefined,
  etapas: readonly EtapaProyecto[] | undefined,
): Map<number, number> {
  const proyectoPorEtapa = new Map(
    (etapas ?? []).map(({ id_etapa, id_proyecto }) => [id_etapa, id_proyecto]),
  );
  const proyectoPorManzana = new Map(
    (manzanas ?? []).flatMap(({ id_manzana, id_etapa }) => {
      const idProyecto = proyectoPorEtapa.get(id_etapa);
      return idProyecto === undefined ? [] : [[id_manzana, idProyecto] as const];
    }),
  );

  return new Map(
    (lotes ?? []).flatMap(({ id_lote, id_manzana }) => {
      const idProyecto = proyectoPorManzana.get(id_manzana);
      return idProyecto === undefined ? [] : [[id_lote, idProyecto] as const];
    }),
  );
}

export function filtrarPorProyecto<T>(
  registros: readonly T[] | undefined,
  proyectoId: number | null,
  obtenerProyecto: (registro: T) => number | undefined,
): T[] {
  if (!registros) return [];
  if (proyectoId === null) return [...registros];
  return registros.filter((registro) => obtenerProyecto(registro) === proyectoId);
}
