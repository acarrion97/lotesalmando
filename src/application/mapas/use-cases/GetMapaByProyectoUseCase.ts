import type { MapaRepository } from "@/domain/mapa/repositories";
import type { Mapa } from "@/domain/mapa/entities";

export class GetMapaByProyectoUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number): Promise<Mapa | null> {
    if (!proyectoId) return null;
    return this.repo.getByProyectoId(proyectoId);
  }
}
