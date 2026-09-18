import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";

export class GetInventarioUseCase {
  private readonly inventarioRepo: InventarioRepository;

  constructor(inventarioRepo: InventarioRepository) {
    this.inventarioRepo = inventarioRepo;
  }

  execute(): Promise<Inventario[]> {
    return this.inventarioRepo.getAll();
  }
}
