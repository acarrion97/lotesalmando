import type { Plan } from "@/domain/plan/entities";
import type { PlanRepository } from "@/domain/plan/repositories";
import type { PlanDto } from "../dto/PlanDto";

export interface GetPlanesOptions {
  /** Si es true, devuelve solo los planes activos (pagina publica). */
  soloActivos?: boolean;
}

export class GetPlanesUseCase {
  private planRepo: PlanRepository;
  constructor(planRepo: PlanRepository) {
    this.planRepo = planRepo;
  }

  async execute(options?: GetPlanesOptions): Promise<PlanDto[]> {
    const planes: Plan[] = await this.planRepo.getAll();
    const filtrados = options?.soloActivos ? planes.filter((p) => p.activo) : planes;
    return filtrados
      .slice()
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
      .map((p) => this.toDto(p));
  }

  private toDto(plan: Plan): PlanDto {
    return {
      id_plan: plan.id_plan,
      clave: plan.clave,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      imagen_url: plan.imagen_url,
      url_checkout: plan.url_checkout,
      precio: plan.precio,
      orden: plan.orden,
      activo: plan.activo,
      es_unico: plan.es_unico,
      max_proyectos: plan.max_proyectos,
      max_lotes_por_proyecto: plan.max_lotes_por_proyecto,
      max_usuarios: plan.max_usuarios,
    };
  }
}
