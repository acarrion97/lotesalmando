import type {
  ConfiguracionContratoRepository,
  SaveConfiguracionContratoInput,
} from "@/domain/configuracion/repositories";
import type { ConfiguracionContrato } from "@/domain/configuracion/entities";

export class SaveConfiguracionContratoUseCase {
  private readonly repo: ConfiguracionContratoRepository;
  constructor(repo: ConfiguracionContratoRepository) {
    this.repo = repo;
  }

  async execute(data: SaveConfiguracionContratoInput): Promise<ConfiguracionContrato> {
    return this.repo.save(data);
  }
}
