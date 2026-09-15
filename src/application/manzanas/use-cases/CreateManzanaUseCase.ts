import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { Manzana } from "@/domain/manzana/entities";

export class CreateManzanaUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(data: Omit<Manzana, "id_manzana">): Promise<Manzana> {
    return this.repo.create(data);
  }
}
