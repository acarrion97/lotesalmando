import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { ProyectoDto } from "../dto/ProyectoDto";

export class GetProyectosUseCase {
  private proyectoRepo: ProyectoRepository;
  constructor(proyectoRepo: ProyectoRepository) {
    this.proyectoRepo = proyectoRepo;
  }

  async execute(empresaId?: number): Promise<ProyectoDto[]> {
    const proyectos: Proyecto[] = empresaId
      ? await this.proyectoRepo.getByEmpresaId(empresaId)
      : await this.proyectoRepo.getAll();
    return proyectos.map((p) => this.toDto(p));
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
