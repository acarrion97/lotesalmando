import type { AsesorRepository } from "@/domain/asesor/repositories";
import type { Asesor } from "@/domain/asesor/entities";

export class UpdateAsesorUseCase {
  private repo: AsesorRepository;
  constructor(repo: AsesorRepository) { this.repo = repo; }
  async execute(id: number, data: Partial<Asesor>): Promise<Asesor> { return this.repo.update(id, data); }
}
