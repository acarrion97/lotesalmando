import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";

export class UpdateOportunidadUseCase {
  private repo: OportunidadRepository;
  constructor(repo: OportunidadRepository) {
    this.repo = repo;
  }
  async execute(id: number, data: Partial<Oportunidad>): Promise<Oportunidad> {
    return this.repo.update(id, data);
  }
}
