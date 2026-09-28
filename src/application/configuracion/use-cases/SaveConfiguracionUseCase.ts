import type {
  ConfiguracionRepository,
  SaveConfiguracionInput,
} from "@/domain/configuracion/repositories";
import type { Configuracion } from "@/domain/configuracion/entities";

export class SaveConfiguracionUseCase {
  private readonly repo: ConfiguracionRepository;
  constructor(repo: ConfiguracionRepository) {
    this.repo = repo;
  }

  async execute(data: SaveConfiguracionInput): Promise<Configuracion> {
    return this.repo.save(data);
  }
}
