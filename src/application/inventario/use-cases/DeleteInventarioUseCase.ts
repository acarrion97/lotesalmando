import type { InventarioRepository } from "@/domain/inventario/repositories";

export class DeleteInventarioUseCase {
  private readonly inventarioRepo: InventarioRepository;

  constructor(inventarioRepo: InventarioRepository) {
    this.inventarioRepo = inventarioRepo;
  }

  execute(id: number): Promise<void> {
    return this.inventarioRepo.delete(id);
  }
}
