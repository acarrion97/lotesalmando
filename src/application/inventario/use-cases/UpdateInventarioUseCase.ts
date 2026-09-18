import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";

export class UpdateInventarioUseCase {
  private readonly inventarioRepo: InventarioRepository;

  constructor(inventarioRepo: InventarioRepository) {
    this.inventarioRepo = inventarioRepo;
  }

  execute(id: number, data: Partial<Inventario>): Promise<Inventario> {
    return this.inventarioRepo.update(id, data);
  }
}
