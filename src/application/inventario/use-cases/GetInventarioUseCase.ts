import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";

export class GetInventarioUseCase {
  private readonly inventarioRepo: InventarioRepository;

  constructor(inventarioRepo: InventarioRepository) {
    this.inventarioRepo = inventarioRepo;
  }

  async execute(empresaId?: number): Promise<Inventario[]> {
    if (empresaId) {
      return this.inventarioRepo.getByEmpresaId(empresaId);
    }
    return this.inventarioRepo.getAll();
  }
}
