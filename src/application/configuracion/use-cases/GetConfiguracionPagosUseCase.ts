import type { ConfiguracionPagosRepository } from "@/domain/configuracion/repositories";
import type { ConfiguracionPagos } from "@/domain/configuracion/entities";

export class GetConfiguracionPagosUseCase {
  private readonly repo: ConfiguracionPagosRepository;
  constructor(repo: ConfiguracionPagosRepository) {
    this.repo = repo;
  }

  async execute(idProyecto: number): Promise<ConfiguracionPagos | null> {
    if (!idProyecto) return null;
    return this.repo.getByProyectoId(idProyecto);
  }
}
