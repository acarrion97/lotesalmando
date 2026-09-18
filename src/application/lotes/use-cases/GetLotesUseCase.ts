import type { Lote } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import type { LoteDto } from "../dto/LoteDto";

export class GetLotesUseCase {
  private lotRepository: LotRepository;
  constructor(lotRepository: LotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute(empresaId?: number): Promise<LoteDto[]> {
    const lotes: Lote[] = empresaId
      ? await this.lotRepository.getByEmpresaId(empresaId)
      : await this.lotRepository.getAll();
    return lotes.map((l) => this.toDto(l));
  }

  private toDto(lote: Lote): LoteDto {
    return {
      id_lote: lote.id_lote,
      id_manzana: lote.id_manzana,
      numero_lote: lote.numero_lote,
      precio_lista: lote.precio_lista,
      estado: lote.estado,
    };
  }
}
