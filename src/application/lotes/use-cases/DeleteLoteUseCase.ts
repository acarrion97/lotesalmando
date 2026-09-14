import type { LotRepository } from "@/domain/lote/repositories";

export class DeleteLoteUseCase {
  private readonly lotRepository: LotRepository;

  constructor(lotRepository: LotRepository) {
    this.lotRepository = lotRepository;
  }

  execute(id: number): Promise<void> {
    return this.lotRepository.delete(id);
  }
}