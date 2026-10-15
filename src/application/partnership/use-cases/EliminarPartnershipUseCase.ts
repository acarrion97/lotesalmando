import type { PartnershipRepository } from "@/domain/partnership/repositories";

/**
 * Elimina un partner. Las empresas que lo tengan asignado quedan sin
 * partner (FK ON DELETE SET NULL, migracion 029).
 */
export class EliminarPartnershipUseCase {
  private partnerRepo: PartnershipRepository;
  constructor(partnerRepo: PartnershipRepository) {
    this.partnerRepo = partnerRepo;
  }

  async execute(idPartner: number): Promise<void> {
    await this.partnerRepo.delete(idPartner);
  }
}
