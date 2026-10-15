import type { Partnership } from "@/domain/partnership/entities";
import type { PartnershipRepository } from "@/domain/partnership/repositories";
import type { PartnershipDto } from "../dto/PartnershipDto";

export interface GuardarPartnershipInput {
  nombre: string;
  codigo: string;
  email: string | null;
  estado: string;
}

/** Crea o actualiza un partnership desde el panel del superadmin. */
export class GuardarPartnershipUseCase {
  private partnerRepo: PartnershipRepository;
  constructor(partnerRepo: PartnershipRepository) {
    this.partnerRepo = partnerRepo;
  }

  async execute(idPartner: number | null, input: GuardarPartnershipInput): Promise<PartnershipDto> {
    const datos = {
      nombre: input.nombre.trim(),
      codigo: input.codigo.trim().toUpperCase(),
      email: input.email?.trim() || null,
      estado: input.estado,
    };

    // El codigo es unico: si ya lo usa otro partner, avisar claro antes
    // de que Supabase devuelva el error crudo de la restriccion.
    const existente = await this.partnerRepo.getByCodigo(datos.codigo);
    if (existente && existente.id_partner !== idPartner) {
      throw new Error(`El codigo "${datos.codigo}" ya esta en uso por otro partner`);
    }

    const partner: Partnership =
      idPartner === null
        ? await this.partnerRepo.create(datos)
        : await this.partnerRepo.update(idPartner, datos);

    return this.toDto(partner);
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
