import type { MapaRepository } from "@/domain/mapa/repositories";
import type { Mapa, UbicacionPlano } from "@/domain/mapa/entities";

/**
 * Guarda (o borra, con `null`) la ubicación GPS y escala real del plano
 * del proyecto. Es lo que habilita la capa satélite y la vista 3D:
 * con el centro y el ancho en metros se calcula qué ventana del mundo
 * cubre la imagen y se piden los tiles que la llenan.
 *
 * Requiere que el proyecto ya tenga imagen de plano, porque la
 * ubicación describe esa imagen.
 */
export class DefinirUbicacionMapaUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number, ubicacion: UbicacionPlano | null): Promise<Mapa> {
    const mapa = await this.repo.getByProyectoId(proyectoId);
    if (!mapa?.url_publica) throw new Error("Primero suba el plano del proyecto");

    if (ubicacion === null) return this.repo.setUbicacion(mapa.id_mapa, null);

    const { centro_lat, centro_lng, ancho_m } = ubicacion;
    if (!Number.isFinite(centro_lat) || Math.abs(centro_lat) > 90) {
      throw new Error("La latitud debe estar entre -90 y 90");
    }
    if (!Number.isFinite(centro_lng) || Math.abs(centro_lng) > 180) {
      throw new Error("La longitud debe estar entre -180 y 180");
    }
    if (!Number.isFinite(ancho_m) || ancho_m <= 0) {
      throw new Error("El ancho real del plano debe ser mayor a 0 metros");
    }
    if (ancho_m > 100000) {
      throw new Error("El ancho del plano parece demasiado grande (máximo 100 km)");
    }

    return this.repo.setUbicacion(mapa.id_mapa, { centro_lat, centro_lng, ancho_m });
  }
}
