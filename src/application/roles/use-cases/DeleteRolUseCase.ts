import type { RolRepository } from "@/domain/rol/repositories";

export class DeleteRolUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }
  async execute(rolId: number): Promise<void> {
    return this.repo.deleteRol(rolId);
  }
}
