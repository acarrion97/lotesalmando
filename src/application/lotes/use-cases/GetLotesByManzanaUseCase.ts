import type { Lote } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import type { LoteDto } from "../dto/LoteDto";

export class GetLotesByManzanaUseCase {
  private lotRepository: LotRepository;
  constructor(lotRepository: LotRepository) {
    this.lotRepository = lotRepository;
  }

  async execute(manzanaId: number): Promise<LoteDto[]> {
    const lotes: Lote[] = await this.lotRepository.getByManzanaId(manzanaId);
    return lotes.map((l) => this.toDto(l));
  }

  private toDto(lote: Lote): LoteDto {
    return {
      id_lote: lote.id_lote,
      id_manzana: lote.id_manzana,
      numero_lote: lote.numero_lote,
      precio_lista: lote.precio_lista,
      estado: lote.estado,
      superficie_m2: lote.superficie_m2 ?? null,
      codigo_catastral: lote.codigo_catastral ?? null,
      medidas: lote.medidas ?? null,
    };
  }
}
