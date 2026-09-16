import type { RolRepository } from "@/domain/rol/repositories";

export class AssignRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) { this.repo = repo; }
  async execute(usuarioId: number, rolId: number): Promise<void> { return this.repo.assignRol(usuarioId, rolId); }
}
