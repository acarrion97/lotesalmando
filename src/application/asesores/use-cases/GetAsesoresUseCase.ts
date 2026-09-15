import type { AsesorRepository } from "@/domain/asesor/repositories";
import type { Asesor } from "@/domain/asesor/entities";

export class GetAsesoresUseCase {
  private repo: AsesorRepository;
  constructor(repo: AsesorRepository) { this.repo = repo; }
  async execute(): Promise<Asesor[]> { return this.repo.getAll(); }
}
