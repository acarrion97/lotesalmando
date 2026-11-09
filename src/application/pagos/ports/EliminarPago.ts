export interface EliminarPagoInput {
  id_pago: number;
  /** Motivo obligatorio: queda guardado en `pagos_eliminaciones`. */
  motivo: string;
  id_usuario: number;
}

export interface PagoEliminado {
  id_pago: number;
  id_cobranza: number;
  /** true si el pago tenía recibo emitido, que se borra junto con él. */
  recibo_eliminado: boolean;
  /** Estado en el que quedó la cuota después de quitar el pago. */
  estado_cuota: string | null;
}

/**
 * Eliminación de un pago, permitida solo cuando la cuota tiene más de un
 * pago (pagos repetidos). Va como RPC (`eliminar_pago`, migración 048):
 * borra el recibo (FK RESTRICT), registra el motivo en la auditoría y
 * recalcula la cuota, todo en una transacción.
 */
export interface EliminarPagoPort {
  execute(input: EliminarPagoInput): Promise<PagoEliminado>;
}
