import type { ProyectoMedioRepository } from "@/domain/proyecto/repositories";
import type { ProyectoMedio } from "@/domain/proyecto/entities";
import type { ProyectoMedioStorage } from "../ports/ProyectoMedioStorage";

/** Quita un medio de la galería: borra la fila y, best-effort, el archivo. */
export class QuitarMedioProyectoUseCase {
  private readonly repo: ProyectoMedioRepository;
  private readonly storage: ProyectoMedioStorage;

  constructor(repo: ProyectoMedioRepository, storage: ProyectoMedioStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(medio: ProyectoMedio): Promise<void> {
    await this.repo.remove(medio.id_proyecto_medio);
    await this.storage.removeByUrl(medio.url).catch(() => undefined);
  }
}
