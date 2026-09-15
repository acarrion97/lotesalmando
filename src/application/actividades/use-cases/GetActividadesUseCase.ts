import type { ActividadRepository } from "@/domain/actividad/repositories";
import type { Actividad } from "@/domain/actividad/entities";

export class GetActividadesUseCase {
  private repo: ActividadRepository;
  constructor(repo: ActividadRepository) {
    this.repo = repo;
  }
  async execute(prospectoId: number): Promise<Actividad[]> {
    return this.repo.getByProspectoId(prospectoId);
  }
}
