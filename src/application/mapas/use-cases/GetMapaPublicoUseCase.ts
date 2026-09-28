import type { MapaRepository } from "@/domain/mapa/repositories";
import type { MapaPublico } from "@/domain/mapa/entities";

export class GetMapaPublicoUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(slug: string): Promise<MapaPublico | null> {
    if (!slug) return null;
    return this.repo.getPublicoBySlug(slug);
  }
}
