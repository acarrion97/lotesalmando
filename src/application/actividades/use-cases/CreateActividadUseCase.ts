import type { ActividadRepository } from "@/domain/actividad/repositories";
import type { Actividad } from "@/domain/actividad/entities";

export class CreateActividadUseCase {
  private repo: ActividadRepository;
  constructor(repo: ActividadRepository) {
    this.repo = repo;
  }
  async execute(data: Omit<Actividad, "id_actividad" | "created_at">): Promise<Actividad> {
    return this.repo.create(data);
  }
}
