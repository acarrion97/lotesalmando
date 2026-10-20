import type { RolRepository } from "@/domain/rol/repositories";
import type { Permiso } from "@/domain/rol/entities";

export class GetAllPermisosUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(): Promise<Permiso[]> {
    return this.repo.getAllPermisos();
  }
}
