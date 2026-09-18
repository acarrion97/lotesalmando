import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";

export class CreateInventarioUseCase {
  private readonly inventarioRepo: InventarioRepository;

  constructor(inventarioRepo: InventarioRepository) {
    this.inventarioRepo = inventarioRepo;
  }

  execute(data: Omit<Inventario, "id_inventario">): Promise<Inventario> {
    return this.inventarioRepo.create(data);
  }
}
