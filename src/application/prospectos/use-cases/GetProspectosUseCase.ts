import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";

export class GetProspectosUseCase {
  private repo: ProspectoRepository;
  constructor(repo: ProspectoRepository) {
    this.repo = repo;
  }
  async execute(empresaId?: number): Promise<Prospecto[]> {
    return empresaId ? this.repo.getByEmpresaId(empresaId) : this.repo.getAll();
  }
}
