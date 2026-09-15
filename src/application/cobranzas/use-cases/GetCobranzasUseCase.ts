import type { Cobranza } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { CobranzaDto } from "../dto/CobranzaDto";

export class GetCobranzasUseCase {
  private cobranzaRepo: CobranzaRepository;
  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(): Promise<CobranzaDto[]> {
    const cobranzas: Cobranza[] = await this.cobranzaRepo.getAll();
    return cobranzas.map((c) => this.toDto(c));
  }

  private toDto(cobranza: Cobranza): CobranzaDto {
    return {
      id_cobranza: cobranza.id_cobranza,
      id_contrato: cobranza.id_contrato,
      numero_cuota: cobranza.numero_cuota,
      monto_cuota: cobranza.monto_cuota,
      estado: cobranza.estado,
      created_at: cobranza.created_at,
    };
  }
}
