export interface RegistrarInteresPublicoCommand {
  /** Slug público del mapa (`/mapa/:slug`); resuelve proyecto y empresa en la base. */
  slug: string;
  id_lote: number;
  nombres: string;
  email: string;
  telefono: string;
}

export interface RegistroInteresResult {
  id_prospecto: number;
  id_oportunidad: number;
  /** true cuando se reusó un prospecto que ya existía con ese email. */
  reutilizado: boolean;
}

/**
 * Registro de interés de un visitante del mapa público: crea (o reusa) el
 * prospecto y arma la oportunidad prospecto↔lote en una sola operación.
 *
 * En producción la implementa la RPC `mapa_publico_registrar_interes` de la
 * migración 018; en modo mock la replica con los repositorios en memoria.
 * Registrar interés no reserva ni mueve el lote.
 */
export interface RegistrarInteresPublicoPort {
  execute(command: RegistrarInteresPublicoCommand): Promise<RegistroInteresResult>;
}
