import type { ReciboRepository } from "@/domain/recibo/repositories";
import type { GeneradorReciboDocumento } from "../ports/GeneradorReciboDocumento";
import { nombreArchivoRecibo } from "../ports/GeneradorReciboDocumento";

/**
 * Baja el PDF del recibo de un pago. Usa el recibo ya persistido: la
 * reimprenta jamás reserva otro número de secuencia, así que el archivo que
 * sale hoy es idéntico al que se generó al confirmar el pago (mismo número
 * y mismo snapshot fiscal).
 */
export class DescargarReciboUseCase {
  private readonly recibos: ReciboRepository;
  private readonly generador: GeneradorReciboDocumento;

  constructor(recibos: ReciboRepository, generador: GeneradorReciboDocumento) {
    this.recibos = recibos;
    this.generador = generador;
  }

  async execute(idPago: number): Promise<{ blob: Blob; nombre: string }> {
    if (!Number.isInteger(idPago) || idPago <= 0) {
      throw new Error("Identificador de pago no válido");
    }
    const recibo = await this.recibos.getByPagoId(idPago);
    if (!recibo) throw new Error("Este pago todavía no tiene un recibo emitido");

    const blob = await this.generador.generar(recibo);
    return { blob, nombre: nombreArchivoRecibo(recibo) };
  }
}
