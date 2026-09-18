import type { RolRepository } from "@/domain/rol/repositories";

export class RemoveRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) { this.repo = repo; }
  async execute(usuarioId: number, rolId: number): Promise<void> { return this.repo.removeRol(usuarioId, rolId); }
}
