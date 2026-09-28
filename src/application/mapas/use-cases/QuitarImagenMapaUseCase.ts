import type { MapaRepository } from "@/domain/mapa/repositories";
import type { MapaImageStorage } from "../ports/MapaImageStorage";

/** Quita el plano del proyecto: borra el objeto y la fila de `mapas`. */
export class QuitarImagenMapaUseCase {
  private readonly repo: MapaRepository;
  private readonly storage: MapaImageStorage;

  constructor(repo: MapaRepository, storage: MapaImageStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(proyectoId: number): Promise<void> {
    const actual = await this.repo.getByProyectoId(proyectoId);
    if (!actual) return;

    await this.repo.remove(actual.id_mapa);
    if (actual.url_publica) {
      await this.storage.removeByUrl(actual.url_publica).catch(() => undefined);
    }
  }
}
