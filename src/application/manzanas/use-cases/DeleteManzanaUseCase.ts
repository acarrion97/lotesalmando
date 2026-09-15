import type { ManzanaRepository } from "@/domain/manzana/repositories";

export class DeleteManzanaUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
