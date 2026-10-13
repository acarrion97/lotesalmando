import type { RolRepository } from "@/domain/rol/repositories";

/**
 * Devuelve los nombres de permiso (`permiso.nombre_permiso`) que un usuario
 * tiene a través de todos sus roles. El frontend los usa para decidir el menú,
 * las rutas permitidas, los botones y el alcance de datos.
 */
export class GetPermisosByUsuarioUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(usuarioId: number): Promise<string[]> {
    return this.repo.getPermisosByUsuarioId(usuarioId);
  }
}
