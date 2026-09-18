import type { RolRepository } from "@/domain/rol/repositories";
import type { Rol } from "@/domain/rol/entities";

export class GetRolesByUsuarioUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) { this.repo = repo; }
  async execute(usuarioId: number): Promise<Rol[]> { return this.repo.getRolesByUsuarioId(usuarioId); }
}
