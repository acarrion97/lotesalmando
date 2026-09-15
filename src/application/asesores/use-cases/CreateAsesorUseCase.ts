import type { AsesorRepository } from "@/domain/asesor/repositories";
import type { Asesor } from "@/domain/asesor/entities";

export class CreateAsesorUseCase {
  private repo: AsesorRepository;
  constructor(repo: AsesorRepository) { this.repo = repo; }
  async execute(data: Omit<Asesor, "id_asesor" | "created_at">): Promise<Asesor> { return this.repo.create(data); }
}
