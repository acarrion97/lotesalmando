import type { AsesorRepository } from "@/domain/asesor/repositories";

export class DeleteAsesorUseCase {
  private repo: AsesorRepository;
  constructor(repo: AsesorRepository) { this.repo = repo; }
  async execute(id: number): Promise<void> { return this.repo.delete(id); }
}
