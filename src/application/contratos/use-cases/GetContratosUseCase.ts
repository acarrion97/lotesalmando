import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { ContratoDto } from "../dto/ContratoDto";

export class GetContratosUseCase {
  private contractRepo: ContractRepository;
  constructor(contractRepo: ContractRepository) {
    this.contractRepo = contractRepo;
  }

  async execute(empresaId?: number): Promise<ContratoDto[]> {
    const contratos: Contrato[] = empresaId
      ? await this.contractRepo.getByEmpresaId(empresaId)
      : await this.contractRepo.getAll();
    return contratos.map((c) => this.toDto(c));
  }

  private toDto(contrato: Contrato): ContratoDto {
    return {
      id_contrato: contrato.id_contrato,
      id_venta: contrato.id_venta,
      numero_contrato: contrato.numero_contrato,
      monto_total: contrato.monto_total,
      created_at: contrato.created_at,
      // El documento viaja en la lista para que los módulos que solo tienen
      // la venta (Ventas, Pagos) puedan ofrecer la descarga sin pedir el
      // contrato uno por uno.
      documento_url: contrato.documento_url ?? null,
      documento_tipo: contrato.documento_tipo ?? null,
      documento_nombre: contrato.documento_nombre ?? null,
      documento_origen: contrato.documento_origen ?? null,
      documento_subido_en: contrato.documento_subido_en ?? null,
    };
  }
}
