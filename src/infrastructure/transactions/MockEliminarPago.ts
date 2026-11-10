import type { EliminarPagoInput, EliminarPagoPort, PagoEliminado } from "@/application/pagos/ports/EliminarPago";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { MockPagoRepository } from "@/infrastructure/repositories/mock/MockPagoRepository";
import type { MockReciboRepository } from "@/infrastructure/repositories/mock/MockReciboRepository";
import { recalcularEstadoCuotaMock } from "./recalcularEstadoCuotaMock";

/** Auditoría en memoria del modo demo (la BD real usa `pagos_eliminaciones`). */
export interface PagoEliminadoMock {
  id_pago: number;
  id_cobranza: number;
  motivo: string;
}

export class MockEliminarPago implements EliminarPagoPort {
  private readonly cobranzas: CobranzaRepository;
  private readonly pagos: MockPagoRepository;
  private readonly recibos: MockReciboRepository;
  readonly eliminaciones: PagoEliminadoMock[] = [];

  constructor(cobranzas: CobranzaRepository, pagos: MockPagoRepository, recibos: MockReciboRepository) {
    this.cobranzas = cobranzas;
    this.pagos = pagos;
    this.recibos = recibos;
  }

  async execute(input: EliminarPagoInput): Promise<PagoEliminado> {
    const motivo = input.motivo.trim();
    if (motivo.length < 5) {
      throw new Error("Indique el motivo de la eliminación (mínimo 5 caracteres)");
    }

    const pago = await this.pagos.getById(input.id_pago);
    if (!pago) throw new Error("El pago no existe o ya fue eliminado");

    const reciboEliminado = this.recibos.deleteByPagoId(input.id_pago);

    this.eliminaciones.push({
      id_pago: pago.id_pago,
      id_cobranza: pago.id_cobranza,
      motivo,
    });

    await this.pagos.delete(pago.id_pago);
    const estado = await recalcularEstadoCuotaMock(this.cobranzas, this.pagos, pago.id_cobranza);

    return {
      id_pago: pago.id_pago,
      id_cobranza: pago.id_cobranza,
      recibo_eliminado: reciboEliminado,
      estado_cuota: estado,
    };
  }
}
