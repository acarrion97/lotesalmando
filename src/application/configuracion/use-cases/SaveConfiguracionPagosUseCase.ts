import type {
  ConfiguracionPagosRepository,
  SaveConfiguracionPagosInput,
} from "@/domain/configuracion/repositories";
import type { ConfiguracionPagos } from "@/domain/configuracion/entities";

export class SaveConfiguracionPagosUseCase {
  private readonly repo: ConfiguracionPagosRepository;
  constructor(repo: ConfiguracionPagosRepository) {
    this.repo = repo;
  }

  async execute(data: SaveConfiguracionPagosInput): Promise<ConfiguracionPagos> {
    return this.repo.save(data);
  }
}
