import type { MapaRepository } from "@/domain/mapa/repositories";
import type { Mapa } from "@/domain/mapa/entities";
import type { MapaImageStorage } from "../ports/MapaImageStorage";

/**
 * Sube el plano del proyecto al almacenamiento y guarda la URL pública en
 * `mapas` (un registro por proyecto). Si la persistencia falla, se borra la
 * imagen recién subida para no dejar huérfanos; si había un plano anterior,
 * se elimina su objeto de forma best-effort.
 */
export class SubirImagenMapaUseCase {
  private readonly repo: MapaRepository;
  private readonly storage: MapaImageStorage;

  constructor(repo: MapaRepository, storage: MapaImageStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(proyectoId: number, file: File): Promise<Mapa> {
    if (!proyectoId) throw new Error("Seleccione un proyecto");
    const anterior = await this.repo.getByProyectoId(proyectoId);

    const { url } = await this.storage.upload({ proyectoId, file });

    let mapa: Mapa;
    try {
      mapa = await this.repo.save({ id_proyecto: proyectoId, url_publica: url });
    } catch (error) {
      await this.storage.removeByUrl(url).catch(() => undefined);
      throw error;
    }

    if (anterior?.url_publica && anterior.url_publica !== url) {
      await this.storage.removeByUrl(anterior.url_publica).catch(() => undefined);
    }

    return mapa;
  }
}
