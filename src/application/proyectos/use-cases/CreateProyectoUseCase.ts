import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";

export class CreateProyectoUseCase {
  private readonly proyectoRepo: ProyectoRepository;

  constructor(proyectoRepo: ProyectoRepository) {
    this.proyectoRepo = proyectoRepo;
  }

  execute(data: Omit<Proyecto, "id_proyecto">): Promise<Proyecto> {
    return this.proyectoRepo.create(data);
  }
}