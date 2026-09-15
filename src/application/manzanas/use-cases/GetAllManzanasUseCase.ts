import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { Manzana } from "@/domain/manzana/entities";

export class GetAllManzanasUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(): Promise<Manzana[]> {
    return this.repo.getAll();
  }
}
