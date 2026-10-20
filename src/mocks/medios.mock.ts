import type { ProyectoMedio } from "@/domain/proyecto/entities";

/**
 * Medios de ejemplo del modo mock (`VITE_DATA_PROVIDER=mock`). Es el mismo
 * arreglo que lee y escribe `MockProyectoMedioRepository` y que consulta
 * `MockMapaRepository` al armar el mapa público.
 */
export const mediosProyecto: ProyectoMedio[] = [
  {
    id_proyecto_medio: 1,
    id_proyecto: 1,
    tipo: "imagen",
    url: "https://picsum.photos/seed/villa-del-lago-1/1400/900",
    orden: 3,
  },
  {
    id_proyecto_medio: 2,
    id_proyecto: 1,
    tipo: "imagen",
    url: "https://picsum.photos/seed/villa-del-lago-2/1400/900",
    orden: 2,
  },
  {
    id_proyecto_medio: 3,
    id_proyecto: 1,
    tipo: "video",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    orden: 1,
  },
  {
    id_proyecto_medio: 4,
    id_proyecto: 2,
    tipo: "imagen",
    url: "https://picsum.photos/seed/el-parque-1/1400/900",
    orden: 1,
  },
];

let siguienteId = mediosProyecto.reduce((max, m) => Math.max(max, m.id_proyecto_medio), 0) + 1;

/** Siguiente id para los medios creados en memoria. */
export function siguienteIdMedio(): number {
  return siguienteId++;
}
