import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { Etapa } from "@/domain/etapa/entities";

export class CreateEtapaUseCase {
  private readonly repo: EtapaRepository;
  constructor(repo: EtapaRepository) {
    this.repo = repo;
  }

  async execute(data: Omit<Etapa, "id_etapa">): Promise<Etapa> {
    return this.repo.create(data);
  }
}
