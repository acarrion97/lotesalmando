import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { Manzana } from "@/domain/manzana/entities";

export class GetManzanasByEtapaUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(etapaId: number): Promise<Manzana[]> {
    return this.repo.getByEtapaId(etapaId);
  }
}
