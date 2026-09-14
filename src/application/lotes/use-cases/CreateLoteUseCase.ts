import type { Lote } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";

export class CreateLoteUseCase {
  private readonly lotRepository: LotRepository;

  constructor(lotRepository: LotRepository) {
    this.lotRepository = lotRepository;
  }

  execute(data: Omit<Lote, "id_lote">): Promise<Lote> {
    return this.lotRepository.create(data);
  }
}