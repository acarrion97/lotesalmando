import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { Etapa } from "@/domain/etapa/entities";

export class GetEtapasByProyectoUseCase {
  private readonly repo: EtapaRepository;
  constructor(repo: EtapaRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number): Promise<Etapa[]> {
    return this.repo.getByProyectoId(proyectoId);
  }
}
