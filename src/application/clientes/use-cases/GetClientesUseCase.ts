import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { ClienteDto } from "../dto/ClienteDto";

export class GetClientesUseCase {
  private clienteRepo: ClienteRepository;
  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  async execute(empresaId: number): Promise<ClienteDto[]> {
    const clientes: Cliente[] = await this.clienteRepo.getByEmpresaId(empresaId);
    return clientes.map((c) => this.toDto(c));
  }

  private toDto(cliente: Cliente): ClienteDto {
    return {
      id_cliente: cliente.id_cliente,
      id_empresa: cliente.id_empresa,
      nombres: cliente.nombres,
      cedula_ruc: cliente.cedula_ruc,
      email: cliente.email,
    };
  }
}
