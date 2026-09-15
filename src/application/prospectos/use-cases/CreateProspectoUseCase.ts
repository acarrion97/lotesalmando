import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";

export class CreateProspectoUseCase {
  private repo: ProspectoRepository;
  constructor(repo: ProspectoRepository) {
    this.repo = repo;
  }
  async execute(data: Omit<Prospecto, "id_prospecto" | "created_at">): Promise<Prospecto> {
    return this.repo.create(data);
  }
}
