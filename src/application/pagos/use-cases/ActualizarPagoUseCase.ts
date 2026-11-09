import type { ActualizarPagoInput, ActualizarPagoPort, PagoActualizado } from "../ports/ActualizarPago";

export class ActualizarPagoUseCase {
  private readonly actualizarPago: ActualizarPagoPort;

  constructor(actualizarPago: ActualizarPagoPort) {
    this.actualizarPago = actualizarPago;
  }

  async execute(input: ActualizarPagoInput): Promise<PagoActualizado> {
    const monto = Math.round(input.monto_pagado * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new Error("El monto pagado debe ser mayor a cero");
    }
    return this.actualizarPago.execute({ ...input, monto_pagado: monto });
  }
}
