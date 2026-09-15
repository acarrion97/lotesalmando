import type { ProspectoRepository } from "@/domain/prospecto/repositories";

export class DeleteProspectoUseCase {
  private repo: ProspectoRepository;
  constructor(repo: ProspectoRepository) {
    this.repo = repo;
  }
  async execute(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
