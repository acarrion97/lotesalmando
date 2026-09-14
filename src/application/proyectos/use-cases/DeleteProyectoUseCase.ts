import type { ProyectoRepository } from "@/domain/proyecto/repositories";

export class DeleteProyectoUseCase {
  private readonly proyectoRepo: ProyectoRepository;

  constructor(proyectoRepo: ProyectoRepository) {
    this.proyectoRepo = proyectoRepo;
  }

  execute(id: number): Promise<void> {
    return this.proyectoRepo.delete(id);
  }
}