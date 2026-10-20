import type { RolRepository } from "@/domain/rol/repositories";

export class DeletePermisoUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(permisoId: number): Promise<void> {
    return this.repo.deletePermiso(permisoId);
  }
}
