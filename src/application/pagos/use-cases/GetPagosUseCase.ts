import type { Pago } from "@/domain/pago/entities";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { PagoDto } from "../dto/PagoDto";

export class GetPagosUseCase {
  private pagoRepo: PagoRepository;
  constructor(pagoRepo: PagoRepository) {
    this.pagoRepo = pagoRepo;
  }

  async execute(empresaId?: number): Promise<PagoDto[]> {
    const pagos: Pago[] = empresaId
      ? await this.pagoRepo.getByEmpresaId(empresaId)
      : await this.pagoRepo.getAll();
    return pagos.map((p) => this.toDto(p));
  }

  private toDto(pago: Pago): PagoDto {
    return {
      id_pago: pago.id_pago,
      id_cobranza: pago.id_cobranza,
      id_usuario: pago.id_usuario,
      monto_pagado: pago.monto_pagado,
      fecha_pago: pago.fecha_pago,
      // Sin este campo el DTO pierde la forma de pago y los reportes la
      // muestran siempre como "No especificada".
      forma_pago: pago.forma_pago,
    };
  }
}
