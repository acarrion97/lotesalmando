import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";

export class GetOportunidadesUseCase {
  private repo: OportunidadRepository;
  constructor(repo: OportunidadRepository) {
    this.repo = repo;
  }
  async execute(empresaId?: number): Promise<Oportunidad[]> {
    return empresaId ? this.repo.getByEmpresaId(empresaId) : this.repo.getAll();
  }
}
