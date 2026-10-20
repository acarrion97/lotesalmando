import type { PlanRepository } from "@/domain/plan/repositories";
import type { PlanImagenStorage } from "../ports/PlanImagenStorage";

/**
 * Elimina un plan y, en el mejor de los casos, su imagen del storage.
 * Un fallo al borrar la imagen no impide eliminar la fila.
 */
export class EliminarPlanUseCase {
  private planRepo: PlanRepository;
  private storage: PlanImagenStorage;
  constructor(planRepo: PlanRepository, storage: PlanImagenStorage) {
    this.planRepo = planRepo;
    this.storage = storage;
  }

  async execute(idPlan: number, imagenUrl?: string | null): Promise<void> {
    await this.planRepo.delete(idPlan);
    if (imagenUrl?.trim()) {
      await this.storage.removeByUrl(imagenUrl.trim()).catch(() => undefined);
    }
  }
}
