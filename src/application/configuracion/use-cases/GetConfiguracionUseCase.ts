import type { ConfiguracionRepository } from "@/domain/configuracion/repositories";
import type { Configuracion } from "@/domain/configuracion/entities";

export class GetConfiguracionUseCase {
  private readonly repo: ConfiguracionRepository;
  constructor(repo: ConfiguracionRepository) {
    this.repo = repo;
  }

  async execute(empresaId: number): Promise<Configuracion | null> {
    if (!empresaId) return null;
    return this.repo.getByEmpresaId(empresaId);
  }
}
