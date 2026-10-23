import type { Plan } from "@/domain/plan/entities";
import type { PlanRepository } from "@/domain/plan/repositories";
import type { PlanImagenStorage } from "../ports/PlanImagenStorage";
import type { PlanDto } from "../dto/PlanDto";

export interface GuardarPlanInput {
  clave: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  url_checkout: string | null;
  /** Precio mensual en USD. NULL = no se muestra en la pagina de planes. */
  precio: number | null;
  orden: number;
  activo: boolean;
  /** Plan "unico": solo por su pagina /registro/<clave> (pago directo), fuera de /registro/planes. */
  es_unico: boolean;
  /** Limites por plan. NULL = sin limite. */
  max_proyectos: number | null;
  max_lotes_por_proyecto: number | null;
  max_usuarios: number | null;
}

/**
 * Crea o actualiza un plan desde el panel del superadmin.
 * Si al editar se reemplaza la imagen, la anterior se borra del storage
 * (mejor esfuerzo: un fallo al borrar no rompe el guardado).
 */
export class GuardarPlanUseCase {
  private planRepo: PlanRepository;
  private storage: PlanImagenStorage;
  constructor(planRepo: PlanRepository, storage: PlanImagenStorage) {
    this.planRepo = planRepo;
    this.storage = storage;
  }

  async execute(
    idPlan: number | null,
    input: GuardarPlanInput,
    imagenAnteriorUrl?: string | null,
  ): Promise<PlanDto> {
    const datos = {
      clave: input.clave.trim().toLowerCase(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      imagen_url: input.imagen_url?.trim() || null,
      url_checkout: input.url_checkout?.trim() || null,
      precio: input.precio,
      orden: input.orden,
      activo: input.activo,
      es_unico: input.es_unico,
      max_proyectos: input.max_proyectos,
      max_lotes_por_proyecto: input.max_lotes_por_proyecto,
      max_usuarios: input.max_usuarios,
    };

    const plan: Plan =
      idPlan === null
        ? await this.planRepo.create(datos)
        : await this.planRepo.update(idPlan, datos);

    const anterior = imagenAnteriorUrl?.trim() || null;
    if (anterior && anterior !== plan.imagen_url) {
      await this.storage.removeByUrl(anterior).catch(() => undefined);
    }

    return this.toDto(plan);
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
