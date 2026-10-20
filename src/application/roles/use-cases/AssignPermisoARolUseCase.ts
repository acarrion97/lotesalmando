import type { RolRepository } from "@/domain/rol/repositories";

export class AssignPermisoARolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(rolId: number, permisoId: number): Promise<void> {
    return this.repo.assignPermisoARol(rolId, permisoId);
  }
}
