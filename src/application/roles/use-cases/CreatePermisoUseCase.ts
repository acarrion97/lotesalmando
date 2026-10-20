import type { RolRepository } from "@/domain/rol/repositories";
import type { Permiso } from "@/domain/rol/entities";

/**
 * Crea un permiso nuevo en el catálogo siguiendo la convención de nombres
 * `<acción>_<recurso>`. El nombre llega ya normalizado desde la UI; acá solo
 * se valida la forma básica.
 */
export class CreatePermisoUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(nombre: string, modulo: string | null): Promise<Permiso> {
    const limpio = nombre.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(limpio)) {
      throw new Error(
        "El nombre del permiso debe ser minúsculas, sin espacios y con guiones bajos (ej: crear_lotes).",
      );
    }
    return this.repo.createPermiso(limpio, modulo?.trim().toLowerCase() || null);
  }
}
