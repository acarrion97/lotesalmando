import type { Recibo } from "@/domain/recibo/entities";

/**
 * Emite el recibo de un pago que ya existe en el sistema (registrado
 * antes de que la emisión de recibos formara parte de la confirmación
 * del pago). Reserva un número de secuencia nuevo: es la **primera**
 * emisión de ese recibo, no una reimprenta, así que está permitido.
 *
 * Si el pago ya tiene recibo, el caso de uso devuelve el existente sin
 * tocar la secuencia.
 */
export interface EmitirReciboPagoPrevio {
  execute(idPago: number): Promise<Recibo>;
}
