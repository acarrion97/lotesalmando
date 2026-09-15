import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { Manzana } from "@/domain/manzana/entities";

export class UpdateManzanaUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(id: number, data: Partial<Manzana>): Promise<Manzana> {
    return this.repo.update(id, data);
  }
}
