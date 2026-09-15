import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";

export class UpdateProspectoUseCase {
  private repo: ProspectoRepository;
  constructor(repo: ProspectoRepository) {
    this.repo = repo;
  }
  async execute(id: number, data: Partial<Prospecto>): Promise<Prospecto> {
    return this.repo.update(id, data);
  }
}
