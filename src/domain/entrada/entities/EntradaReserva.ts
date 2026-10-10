/**
 * Entrada (seña) cobrada al reservar un lote.
 *
 * La reserva no crea venta ni contrato, así que no puede apuntar a una
 * cobranza como los pagos normales: se registra aparte, ligada al lote y al
 * prospecto que reservó. Es dinero real recibido, no una simulación.
 */
export interface EntradaReserva {
  id_entrada: number;
  id_lote: number;
  /** Prospecto que reservó el lote; null si la reserva no viene del pipeline. */
  id_prospecto: number | null;
  /** Denormalizado para filtrar por tenant sin recorrer la cadena de lotes. */
  id_empresa: number | null;
  id_usuario: number;
  monto: number;
  /** Fecha del cobro en ISO (YYYY-MM-DD o timestamp). */
  fecha_pago: string;
  created_at?: string;
}
