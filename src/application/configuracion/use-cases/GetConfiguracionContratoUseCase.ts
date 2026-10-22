import type { ConfiguracionContratoRepository } from "@/domain/configuracion/repositories";
import type { ConfiguracionContrato } from "@/domain/configuracion/entities";

export class GetConfiguracionContratoUseCase {
  private readonly repo: ConfiguracionContratoRepository;
  constructor(repo: ConfiguracionContratoRepository) {
    this.repo = repo;
  }

  async execute(idProyecto: number): Promise<ConfiguracionContrato | null> {
    if (!idProyecto) return null;
    return this.repo.getByProyectoId(idProyecto);
  }
}
