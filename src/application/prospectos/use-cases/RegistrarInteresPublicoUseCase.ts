import type {
  RegistrarInteresPublicoCommand,
  RegistrarInteresPublicoPort,
  RegistroInteresResult,
} from "@/application/prospectos/ports/RegistrarInteresPublicoPort";

/**
 * Registro de interés de un visitante del mapa público (`/mapa/:slug`): deja
 * nombre, email y teléfono a cambio de que le guarden el lote que le interesa.
 *
 * Crea (o reusa por email) el prospecto y arma la oportunidad prospecto↔lote
 * en la base, en una sola transacción. No reserva ni mueve el lote: es solo
 * una entrada de CRM para que un asesor haga seguimiento.
 *
 * Las mismas validaciones existen en la RPC (migración 018) por si alguien
 * las saltea llamándola directamente; acá sirven para responder sin ida y
 * vuelta a la base.
 */
export class RegistrarInteresPublicoUseCase {
  private readonly registrar: RegistrarInteresPublicoPort;

  constructor(registrar: RegistrarInteresPublicoPort) {
    this.registrar = registrar;
  }

  async execute(command: RegistrarInteresPublicoCommand): Promise<RegistroInteresResult> {
    const datos: RegistrarInteresPublicoCommand = {
      slug: command.slug.trim(),
      id_lote: command.id_lote,
      nombres: command.nombres.trim(),
      email: command.email.trim(),
      telefono: command.telefono.trim(),
    };

    if (datos.nombres.length < 2) throw new Error("Ingrese su nombre");
    if (!datos.email.includes("@")) throw new Error("Ingrese un email válido");
    if (datos.telefono.length < 5) throw new Error("Ingrese un teléfono válido");
    if (!Number.isInteger(datos.id_lote) || datos.id_lote <= 0) {
      throw new Error("Seleccione un lote");
    }

    return this.registrar.execute(datos);
  }
}
