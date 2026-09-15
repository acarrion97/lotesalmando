import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";

export class GetProspectosUseCase {
  private repo: ProspectoRepository;
  constructor(repo: ProspectoRepository) {
    this.repo = repo;
  }
  async execute(): Promise<Prospecto[]> {
    return this.repo.getAll();
  }
}
