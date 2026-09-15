import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";

export class GetOportunidadesUseCase {
  private repo: OportunidadRepository;
  constructor(repo: OportunidadRepository) {
    this.repo = repo;
  }
  async execute(): Promise<Oportunidad[]> {
    return this.repo.getAll();
  }
}
