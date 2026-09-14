import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { ContratoDto } from "../dto/ContratoDto";

export class GetContratosUseCase {
  private contractRepo: ContractRepository;
  constructor(contractRepo: ContractRepository) {
    this.contractRepo = contractRepo;
  }

  async execute(): Promise<ContratoDto[]> {
    const contratos: Contrato[] = await this.contractRepo.getAll();
    return contratos.map((c) => this.toDto(c));
  }

  private toDto(contrato: Contrato): ContratoDto {
    return {
      id_contrato: contrato.id_contrato,
      id_venta: contrato.id_venta,
      numero_contrato: contrato.numero_contrato,
      monto_total: contrato.monto_total,
    };
  }
}
