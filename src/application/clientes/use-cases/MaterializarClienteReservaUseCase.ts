import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";

/** Snapshot del cliente capturado al reservar, guardado en la oportunidad. */
export interface DatosClienteReserva {
  id_empresa: number | null;
  nombres: string;
  cedula_ruc: string;
  email: string;
  telefono: string | null;
}

/**
 * Copia los datos del cliente de una reserva (snapshot guardado en la
 * oportunidad, etapa `reserva`) a la tabla `cliente` cuando el lote pasa a
 * "vendido".
 *
 * Reservar ya no crea `cliente`: sus datos viven en `oportunidades` hasta que
 * se confirma la venta. Este caso de uso materializa esa copia reusando un
 * `cliente` existente por cédula o email dentro de la misma empresa, para no
 * duplicar filas si la persona ya había comprado antes. Es idempotente: si la
 * venta se reintenta, reutiliza el `cliente` ya creado.
 */
export class MaterializarClienteReservaUseCase {
  private readonly clienteRepo: ClienteRepository;

  constructor(clienteRepo: ClienteRepository) {
    this.clienteRepo = clienteRepo;
  }

  async execute(datos: DatosClienteReserva): Promise<Cliente> {
    const cedula = datos.cedula_ruc.trim();
    const email = datos.email.trim().toLowerCase();
    if (datos.nombres.trim().length < 2) {
      throw new Error("Faltan los datos del cliente de la reserva");
    }

    const clientes = await this.clienteRepo.getAll();
    const existente = clientes.find(
      (c) =>
        (datos.id_empresa === null || c.id_empresa === datos.id_empresa) &&
        ((cedula !== "" && c.cedula_ruc === cedula) ||
          (email !== "" && (c.email ?? "").toLowerCase() === email)),
    );
    if (existente) return existente;

    return this.clienteRepo.create({
      id_empresa: datos.id_empresa,
      nombres: datos.nombres.trim(),
      cedula_ruc: cedula,
      email: datos.email.trim(),
      telefono: datos.telefono,
    });
  }
}
