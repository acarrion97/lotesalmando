import type { MapaRepository } from "@/domain/mapa/repositories";
import type { Mapa } from "@/domain/mapa/entities";
import type { MapaImageStorage } from "../ports/MapaImageStorage";

/** Carpeta propia dentro de `proyecto-<id>/` para no mezclarlo con el plano. */
export const CARPETA_RENDER_3D = "render-3d";

/**
 * Sube el render 3D del proyecto al almacenamiento y guarda la URL pública
 * en `mapas.render_3d_url`. El render vive en su propia subcarpeta, así que
 * reemplazarlo o quitarlo nunca toca la imagen del plano. Si la
 * persistencia falla, se borra el objeto recién subido para no dejar
 * huérfanos; el render anterior se elimina de forma best-effort.
 */
export class SubirRender3DUseCase {
  private readonly repo: MapaRepository;
  private readonly storage: MapaImageStorage;

  constructor(repo: MapaRepository, storage: MapaImageStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(proyectoId: number, file: File): Promise<Mapa> {
    if (!proyectoId) throw new Error("Seleccione un proyecto");

    const mapa = await this.repo.getByProyectoId(proyectoId);
    if (!mapa) throw new Error("Cargá primero el plano del proyecto");

    const { url } = await this.storage.upload({ proyectoId, file, carpeta: CARPETA_RENDER_3D });

    let actualizado: Mapa;
    try {
      actualizado = await this.repo.setRender3D(mapa.id_mapa, url);
    } catch (error) {
      await this.storage.removeByUrl(url).catch(() => undefined);
      throw error;
    }

    if (mapa.render_3d_url && mapa.render_3d_url !== url) {
      await this.storage.removeByUrl(mapa.render_3d_url).catch(() => undefined);
    }

    return actualizado;
  }
}
