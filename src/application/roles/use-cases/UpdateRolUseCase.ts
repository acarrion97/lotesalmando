import type { RolRepository } from "@/domain/rol/repositories";
import type { Rol } from "@/domain/rol/entities";

export class UpdateRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(rolId: number, nombre: string): Promise<Rol> {
    const limpio = nombre.trim();
    if (limpio.length < 2) throw new Error("El nombre del rol debe tener al menos 2 caracteres.");
    return this.repo.updateRol(rolId, limpio);
  }
}
