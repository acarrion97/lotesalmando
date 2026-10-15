export interface SubirImagenPlanInput {
  file: File;
}

export interface SubirImagenPlanResult {
  /** URL pública con la que se sirve la imagen. */
  url: string;
}

/**
 * Puerto (implementado en infraestructura) para guardar la imagen de un
 * plan en el almacenamiento de objetos. La URL que devuelve es la que se
 * persiste en `plan.imagen_url`.
 */
export interface PlanImagenStorage {
  upload(input: SubirImagenPlanInput): Promise<SubirImagenPlanResult>;
  /** Borrado "mejor esfuerzo": si la URL no es reconocible, no hace nada. */
  removeByUrl(url: string): Promise<void>;
}

/** Formatos y límite que acepta la imagen de un plan (igual que el bucket). */
export const FORMATOS_IMAGEN_PLAN: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
export const LIMITE_IMAGEN_PLAN_BYTES = 5 * 1024 * 1024;

/** Mensaje de error si el archivo no sirve como imagen de plan, o `null`. */
export function validarImagenPlan(file: File): string | null {
  if (!FORMATOS_IMAGEN_PLAN.includes(file.type)) {
    return "Formato no admitido: usá PNG, JPG o WEBP";
  }
  if (file.size > LIMITE_IMAGEN_PLAN_BYTES) {
    return "La imagen supera los 5 MB";
  }
  return null;
}
