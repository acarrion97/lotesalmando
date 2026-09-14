import type { Lote } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";

export class UpdateLoteUseCase {
  private readonly lotRepository: LotRepository;

  constructor(lotRepository: LotRepository) {
    this.lotRepository = lotRepository;
  }

  execute(id: number, data: Partial<Lote>): Promise<Lote> {
    return this.lotRepository.update(id, data);
  }
}