import type { MapaRepository } from "@/domain/mapa/repositories";
import type { MapaImageStorage } from "../ports/MapaImageStorage";

/**
 * Quita el render 3D del proyecto: borra el objeto de storage (en su
 * subcarpeta `render-3d/`) y limpia `mapas.render_3d_url`. El plano y la
 * galería no se tocan.
 */
export class QuitarRender3DUseCase {
  private readonly repo: MapaRepository;
  private readonly storage: MapaImageStorage;

  constructor(repo: MapaRepository, storage: MapaImageStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(proyectoId: number): Promise<void> {
    const mapa = await this.repo.getByProyectoId(proyectoId);
    if (!mapa?.render_3d_url) return;

    await this.repo.setRender3D(mapa.id_mapa, null);
    await this.storage.removeByUrl(mapa.render_3d_url).catch(() => undefined);
  }
}
