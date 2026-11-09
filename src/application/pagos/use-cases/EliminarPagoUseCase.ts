import type { EliminarPagoInput, EliminarPagoPort, PagoEliminado } from "../ports/EliminarPago";

export class EliminarPagoUseCase {
  private readonly eliminarPago: EliminarPagoPort;

  constructor(eliminarPago: EliminarPagoPort) {
    this.eliminarPago = eliminarPago;
  }

  /**
   * El motivo es obligatorio: es lo que explica el borrado y queda guardado
   * en `pagos_eliminaciones` (migración 048).
   */
  async execute(input: EliminarPagoInput): Promise<PagoEliminado> {
    const motivo = input.motivo.trim();
    if (motivo.length < 5) {
      throw new Error("Indique el motivo de la eliminación (mínimo 5 caracteres)");
    }
    return this.eliminarPago.execute({ ...input, motivo });
  }
}
