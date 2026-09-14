import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { ProyectoDto } from "../dto/ProyectoDto";

export class GetProyectoByIdUseCase {
  private proyectoRepo: ProyectoRepository;
  constructor(proyectoRepo: ProyectoRepository) {
    this.proyectoRepo = proyectoRepo;
  }

  async execute(id: number): Promise<ProyectoDto | null> {
    const proyecto: Proyecto | null = await this.proyectoRepo.getById(id);
    if (!proyecto) return null;
    return this.toDto(proyecto);
  }

  private toDto(proyecto: Proyecto): ProyectoDto {
    return {
      id_proyecto: proyecto.id_proyecto,
      id_empresa: proyecto.id_empresa,
      nombre: proyecto.nombre,
      estado: proyecto.estado,
    };
  }
}
