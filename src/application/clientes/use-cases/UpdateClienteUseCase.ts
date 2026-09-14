import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";

export class UpdateClienteUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  execute(id: number, data: Partial<Cliente>): Promise<Cliente> {
    return this.clienteRepo.update(id, data);
  }
}