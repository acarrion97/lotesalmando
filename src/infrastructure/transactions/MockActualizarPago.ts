import type {
  ActualizarPagoInput,
  ActualizarPagoPort,
  PagoActualizado,
} from "@/application/pagos/ports/ActualizarPago";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { MockPagoRepository } from "@/infrastructure/repositories/mock/MockPagoRepository";
import type { MockReciboRepository } from "@/infrastructure/repositories/mock/MockReciboRepository";
import { recalcularEstadoCuotaMock } from "./recalcularEstadoCuotaMock";

export class MockActualizarPago implements ActualizarPagoPort {
  private readonly cobranzas: CobranzaRepository;
  private readonly pagos: MockPagoRepository;
  private readonly recibos: MockReciboRepository;

  constructor(cobranzas: CobranzaRepository, pagos: MockPagoRepository, recibos: MockReciboRepository) {
    this.cobranzas = cobranzas;
    this.pagos = pagos;
    this.recibos = recibos;
  }

  async execute(input: ActualizarPagoInput): Promise<PagoActualizado> {
    const pago = await this.pagos.getById(input.id_pago);
    if (!pago) throw new Error("El pago no existe");

    const actualizado = await this.pagos.update(input.id_pago, {
      monto_pagado: input.monto_pagado,
      fecha_pago: input.fecha_pago.slice(0, 10),
      forma_pago: input.forma_pago,
    });

    const estado = await recalcularEstadoCuotaMock(this.cobranzas, this.pagos, pago.id_cobranza);
    const recibo = await this.recibos.getByPagoId(input.id_pago);

    return {
      pago: actualizado,
      tiene_recibo: recibo !== null,
      estado_cuota: estado ?? "",
    };
  }
}
