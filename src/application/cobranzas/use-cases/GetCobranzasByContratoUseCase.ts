import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { CobranzaDto } from "../dto/CobranzaDto";

export class GetCobranzasByContratoUseCase {
  private cobranzaRepo: CobranzaRepository;
  constructor(cobranzaRepo: CobranzaRepository) {
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(contratoId: number): Promise<CobranzaDto[]> {
    const cobranzas = await this.cobranzaRepo.getByContratoId(contratoId);
    return cobranzas
      .map((c) => ({
        id_cobranza: c.id_cobranza,
        id_contrato: c.id_contrato,
        numero_cuota: c.numero_cuota,
        monto_cuota: c.monto_cuota,
        estado: c.estado,
        fecha_vencimiento: c.fecha_vencimiento,
        created_at: c.created_at,
      }))
      .sort((a, b) => a.numero_cuota - b.numero_cuota);
  }
}
