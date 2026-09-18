import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { Manzana } from "@/domain/manzana/entities";

export class GetAllManzanasUseCase {
  private readonly repo: ManzanaRepository;
  constructor(repo: ManzanaRepository) {
    this.repo = repo;
  }

  async execute(empresaId?: number): Promise<Manzana[]> {
    if (empresaId) {
      return this.repo.getByEmpresaId(empresaId);
    }
    return this.repo.getAll();
  }
}
