import type { Partnership } from "@/domain/partnership/entities";
import type { PartnershipRepository } from "@/domain/partnership/repositories";
import type { PartnershipDto } from "../dto/PartnershipDto";

export class GetPartnershipsUseCase {
  private partnerRepo: PartnershipRepository;
  constructor(partnerRepo: PartnershipRepository) {
    this.partnerRepo = partnerRepo;
  }

  async execute(): Promise<PartnershipDto[]> {
    const partners: Partnership[] = await this.partnerRepo.getAll();
    return partners
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((p) => this.toDto(p));
  }

  private toDto(partner: Partnership): PartnershipDto {
    return {
      id_partner: partner.id_partner,
      nombre: partner.nombre,
      codigo: partner.codigo,
      email: partner.email,
      estado: partner.estado,
      created_at: partner.created_at,
    };
  }
}
