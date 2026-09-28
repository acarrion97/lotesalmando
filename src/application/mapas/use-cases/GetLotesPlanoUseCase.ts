import type { MapaRepository } from "@/domain/mapa/repositories";
import type { PlanoLote } from "@/domain/mapa/entities";

export class GetLotesPlanoUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number): Promise<PlanoLote[]> {
    if (!proyectoId) return [];
    return this.repo.getLotesPlano(proyectoId);
  }
}
