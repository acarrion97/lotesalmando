import type { RolRepository } from "@/domain/rol/repositories";
import type { Rol } from "@/domain/rol/entities";

export class GetRolesUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) { this.repo = repo; }
  async execute(): Promise<Rol[]> { return this.repo.getAll(); }
}
