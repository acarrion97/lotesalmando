import type { ClienteRepository } from "@/domain/cliente/repositories";

export class DeleteClienteUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  execute(id: number): Promise<void> {
    return this.clienteRepo.delete(id);
  }
}