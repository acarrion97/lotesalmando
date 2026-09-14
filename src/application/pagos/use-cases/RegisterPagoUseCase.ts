import type { Cobranza } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { Pago } from "@/domain/pago/entities";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { PagoDto } from "../dto/PagoDto";

export class RegisterPagoUseCase {
  private cobranzaRepo: CobranzaRepository;
  private pagoRepo: PagoRepository;
  constructor(cobranzaRepo: CobranzaRepository, pagoRepo: PagoRepository) {
    this.cobranzaRepo = cobranzaRepo;
    this.pagoRepo = pagoRepo;
  }

  async execute(data: {
    id_cobranza: number;
    id_usuario: number;
    monto_pagado: number;
    fecha_pago: string;
  }): Promise<PagoDto> {
    const cobranza: Cobranza | null = await this.cobranzaRepo.getById(data.id_cobranza);
    if (!cobranza) throw new Error(`Cobranza ${data.id_cobranza} not found`);

    if (cobranza.estado === "pagada") {
      throw new Error(`Cobranza ${data.id_cobranza} ya esta pagada`);
    }

    const pago: Pago = await this.pagoRepo.create({
      id_cobranza: data.id_cobranza,
      id_usuario: data.id_usuario,
      monto_pagado: data.monto_pagado,
      fecha_pago: data.fecha_pago,
    });

    await this.cobranzaRepo.updateEstado(data.id_cobranza, "pagada");

    return this.toDto(pago);
  }

  private toDto(pago: Pago): PagoDto {
    return {
      id_pago: pago.id_pago,
      id_cobranza: pago.id_cobranza,
      id_usuario: pago.id_usuario,
      monto_pagado: pago.monto_pagado,
      fecha_pago: pago.fecha_pago,
    };
  }
}
