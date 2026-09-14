import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";

export class UpdateProyectoUseCase {
  private readonly proyectoRepo: ProyectoRepository;

  constructor(proyectoRepo: ProyectoRepository) {
    this.proyectoRepo = proyectoRepo;
  }

  execute(id: number, data: Partial<Proyecto>): Promise<Proyecto> {
    return this.proyectoRepo.update(id, data);
  }
}