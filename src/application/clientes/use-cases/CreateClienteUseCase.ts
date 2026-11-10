import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import { validarIdentificacionUnica } from "../validarIdentificacionUnica";

export class CreateClienteUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  execute(data: Omit<Cliente, "id_cliente">): Promise<Cliente> {
    return validarIdentificacionUnica(this.clienteRepo, data.id_empresa, data.cedula_ruc).then(() =>
      this.clienteRepo.create(data),
    );
  }
}
