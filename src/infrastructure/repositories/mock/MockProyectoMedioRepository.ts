import type { ProyectoMedio } from "@/domain/proyecto/entities";
import type {
  AddProyectoMedioInput,
  ProyectoMedioRepository,
} from "@/domain/proyecto/repositories";

import { mediosProyecto, siguienteIdMedio } from "@/mocks/medios.mock";

/** Memoria compartida con `MockMapaRepository` (solo `VITE_DATA_PROVIDER=mock`). */
export class MockProyectoMedioRepository implements ProyectoMedioRepository {
  async getByProyectoId(proyectoId: number): Promise<ProyectoMedio[]> {
    return mediosProyecto
      .filter((m) => m.id_proyecto === proyectoId)
      .sort((a, b) => b.orden - a.orden || b.id_proyecto_medio - a.id_proyecto_medio);
  }

  async add(data: AddProyectoMedioInput): Promise<ProyectoMedio> {
    // Mismo criterio que el repositorio real: contador por proyecto, con el
    // `id` descendente como desempate para lo subido en el mismo instante.
    const orden =
      Math.max(
        0,
        ...mediosProyecto
          .filter((m) => m.id_proyecto === data.id_proyecto)
          .map((m) => m.orden),
      ) + 1;

    const medio: ProyectoMedio = {
      id_proyecto_medio: siguienteIdMedio(),
      id_proyecto: data.id_proyecto,
      tipo: data.tipo,
      url: data.url,
      orden,
    };
    mediosProyecto.push(medio);
    return medio;
  }

  async remove(id: number): Promise<void> {
    const index = mediosProyecto.findIndex((m) => m.id_proyecto_medio === id);
    if (index >= 0) mediosProyecto.splice(index, 1);
  }
}
