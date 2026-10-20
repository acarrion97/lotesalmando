import type { RolRepository } from "@/domain/rol/repositories";

export class GetPermisoIdsByRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(rolId: number): Promise<number[]> {
    return this.repo.getPermisoIdsByRol(rolId);
  }
}
