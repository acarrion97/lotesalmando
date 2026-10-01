import type { ProyectoMedioRepository } from "@/domain/proyecto/repositories";
import type { ProyectoMedio } from "@/domain/proyecto/entities";

/** Medios (fotos/videos) del proyecto para la tarjeta de Configuración. */
export class GetMediosProyectoUseCase {
  private readonly repo: ProyectoMedioRepository;
  constructor(repo: ProyectoMedioRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number): Promise<ProyectoMedio[]> {
    if (!proyectoId) return [];
    return this.repo.getByProyectoId(proyectoId);
  }
}
