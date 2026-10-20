import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";

/**
 * Un contrato por id, con las columnas del documento. La lista de
 * contratos se trae aparte (más liviana) y no incluye `documento_url`.
 */
export class GetContratoUseCase {
  private contratos: ContractRepository;

  constructor(contratos: ContractRepository) {
    this.contratos = contratos;
  }

  async execute(id: number): Promise<Contrato | null> {
    return this.contratos.getById(id);
  }
}
