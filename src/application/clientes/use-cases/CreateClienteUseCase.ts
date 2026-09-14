import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";

export class CreateClienteUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  execute(data: Omit<Cliente, "id_cliente">): Promise<Cliente> {
    return this.clienteRepo.create(data);
  }
}