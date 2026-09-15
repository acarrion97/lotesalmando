import type { EtapaRepository } from "@/domain/etapa/repositories";

export class DeleteEtapaUseCase {
  private readonly repo: EtapaRepository;
  constructor(repo: EtapaRepository) {
    this.repo = repo;
  }

  async execute(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
