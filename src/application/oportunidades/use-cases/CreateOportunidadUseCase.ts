import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";

export class CreateOportunidadUseCase {
  private repo: OportunidadRepository;
  constructor(repo: OportunidadRepository) {
    this.repo = repo;
  }
  async execute(data: Omit<Oportunidad, "id_oportunidad" | "created_at">): Promise<Oportunidad> {
    return this.repo.create(data);
  }
}
