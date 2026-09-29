import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { ClienteDto } from "../dto/ClienteDto";

/**
 * Returns every client, without tenant scoping. `cliente` has no id_empresa
 * column, so this is the only way to reach clients that are not linked to a
 * venta yet (e.g. one created while reserving a lot) when picking one in a
 * cotizacion form. The Clientes *table* keeps using GetClientesUseCase.
 */
export class GetAllClientesUseCase {
  private clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  async execute(): Promise<ClienteDto[]> {
    const clientes: Cliente[] = await this.clienteRepo.getAll();
    return clientes.map((c) => this.toDto(c));
  }

  private toDto(cliente: Cliente): ClienteDto {
    return {
      id_cliente: cliente.id_cliente,
      nombres: cliente.nombres,
      cedula_ruc: cliente.cedula_ruc,
      email: cliente.email,
    };
  }
}
