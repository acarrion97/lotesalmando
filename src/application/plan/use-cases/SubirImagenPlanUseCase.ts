import type { PlanImagenStorage } from "../ports/PlanImagenStorage";
import { validarImagenPlan } from "../ports/PlanImagenStorage";

/** Sube la imagen de un plan al storage y devuelve su URL pública. */
export class SubirImagenPlanUseCase {
  private storage: PlanImagenStorage;
  constructor(storage: PlanImagenStorage) {
    this.storage = storage;
  }

  async execute(file: File): Promise<{ url: string }> {
    const error = validarImagenPlan(file);
    if (error) throw new Error(error);
    return this.storage.upload({ file });
  }
}
