import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { Etapa } from "@/domain/etapa/entities";

export class UpdateEtapaUseCase {
  private readonly repo: EtapaRepository;
  constructor(repo: EtapaRepository) {
    this.repo = repo;
  }

  async execute(id: number, data: Partial<Etapa>): Promise<Etapa> {
    return this.repo.update(id, data);
  }
}
