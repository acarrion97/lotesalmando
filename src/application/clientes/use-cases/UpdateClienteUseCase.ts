import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import { validarIdentificacionUnica } from "../validarIdentificacionUnica";

export class UpdateClienteUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  async execute(id: number, data: Partial<Cliente>): Promise<Cliente> {
    const actual = await this.clienteRepo.getById(id);
    if (!actual) throw new Error(`Cliente ${id} no encontrado`);

    await validarIdentificacionUnica(
      this.clienteRepo,
      data.id_empresa ?? actual.id_empresa,
      data.cedula_ruc ?? actual.cedula_ruc,
      id,
    );
    return this.clienteRepo.update(id, data);
  }
}
