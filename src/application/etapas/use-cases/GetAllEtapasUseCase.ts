import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { Etapa } from "@/domain/etapa/entities";

export class GetAllEtapasUseCase {
  private readonly repo: EtapaRepository;
  constructor(repo: EtapaRepository) {
    this.repo = repo;
  }

  async execute(empresaId?: number): Promise<Etapa[]> {
    if (empresaId) {
      return this.repo.getByEmpresaId(empresaId);
    }
    return this.repo.getAll();
  }
}
