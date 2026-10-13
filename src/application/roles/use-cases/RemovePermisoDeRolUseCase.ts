import type { RolRepository } from "@/domain/rol/repositories";

export class RemovePermisoDeRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(rolId: number, permisoId: number): Promise<void> {
    return this.repo.removePermisoDeRol(rolId, permisoId);
  }
}
