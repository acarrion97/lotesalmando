import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { ReservarLoteUseCase } from "@/application/lotes/use-cases/ReservarLoteUseCase";

export interface DatosClienteReserva {
  nombres: string;
  cedula_ruc: string;
  email: string;
  telefono: string | null;
}

export interface ReservarProspectoInput {
  idProspecto: number;
  idLote: number;
  usuarioId: number;
  /** Asesor de la sesión; null cuando la cuenta no tiene asesor vinculado. */
  idAsesor: number | null;
  cliente: DatosClienteReserva;
}

export interface ReservarProspectoResult {
  prospecto: Prospecto;
  cliente: Cliente;
  oportunidad: Oportunidad;
}

/**
 * Reserva de un lote disparada por el pipeline de prospectos (estado "reserva").
 *
 * Orquesta en orden: cliente → reserva del lote → oportunidad prospecto↔lote →
 * actualización del prospecto. No es transaccional, así que si algo falla
 * después de reservar el lote se compensa (el lote vuelve a "disponible" y se
 * borran los movimientos de inventario creados en esta operación) para no
 * dejar reservas huérfanas.
 */
export class ReservarProspectoUseCase {
  private readonly prospectoRepo: ProspectoRepository;
  private readonly clienteRepo: ClienteRepository;
  private readonly lotRepo: LotRepository;
  private readonly inventarioRepo: InventarioRepository;
  private readonly oportunidadRepo: OportunidadRepository;
  private readonly reservarLote: ReservarLoteUseCase;

  constructor(deps: {
    prospectoRepo: ProspectoRepository;
    clienteRepo: ClienteRepository;
    lotRepo: LotRepository;
    inventarioRepo: InventarioRepository;
    oportunidadRepo: OportunidadRepository;
    reservarLote: ReservarLoteUseCase;
  }) {
    this.prospectoRepo = deps.prospectoRepo;
    this.clienteRepo = deps.clienteRepo;
    this.lotRepo = deps.lotRepo;
    this.inventarioRepo = deps.inventarioRepo;
    this.oportunidadRepo = deps.oportunidadRepo;
    this.reservarLote = deps.reservarLote;
  }

  async execute(input: ReservarProspectoInput): Promise<ReservarProspectoResult> {
    this.validarDatosCliente(input.cliente);

    const prospecto = await this.prospectoRepo.getById(input.idProspecto);
    if (!prospecto) throw new Error("El prospecto ya no existe");

    const lote = await this.lotRepo.getById(input.idLote);
    if (!lote) throw new Error(`Lote ${input.idLote} no encontrado`);
    if (lote.estado !== "disponible") {
      throw new Error(`El lote ${lote.numero_lote} ya no esta disponible (estado: ${lote.estado})`);
    }

    const cliente = await this.obtenerOCrearCliente(input.cliente);

    // Marca los movimientos previos para poder deshacer solo los de esta
    // operación si algo falla después de la reserva.
    const movimientosPrevios = new Set(
      (await this.inventarioRepo.getByLoteId(input.idLote)).map((m) => m.id_inventario),
    );

    // ReservarLoteUseCase vuelve a validar la disponibilidad y registra inventario.
    await this.reservarLote.execute(input.idLote, input.usuarioId);

    let oportunidad: Oportunidad | null = null;
    try {
      oportunidad = await this.oportunidadRepo.create({
        id_empresa: prospecto.id_empresa,
        id_prospecto: prospecto.id_prospecto,
        id_lote: input.idLote,
        etapa: "reserva",
        valor_estimado: lote.precio_lista ?? 0,
        notas: "",
      });

      const prospectoActualizado = await this.prospectoRepo.update(prospecto.id_prospecto, {
        estado: "reserva",
        fecha_ultimo_seguimiento: new Date().toISOString(),
        id_asesor: input.idAsesor,
      });

      return { prospecto: prospectoActualizado, cliente, oportunidad };
    } catch (error) {
      if (oportunidad) {
        await this.oportunidadRepo.delete(oportunidad.id_oportunidad).catch(() => undefined);
      }
      const revertida = await this.revertirReserva(input.idLote, movimientosPrevios);
      const detalle = error instanceof Error ? error.message : "Error desconocido";
      if (revertida) {
        throw new Error(`No se pudo completar la reserva: ${detalle}. La reserva fue revertida.`, {
          cause: error,
        });
      }
      throw new Error(
        `No se pudo completar la reserva: ${detalle}. Revisa el estado del lote manualmente.`,
        { cause: error },
      );
    }
  }

  private validarDatosCliente(cliente: DatosClienteReserva): void {
    if (cliente.nombres.trim().length < 2) {
      throw new Error("Ingrese el nombre del cliente");
    }
    if (cliente.cedula_ruc.trim().length < 5) {
      throw new Error("Ingrese la cedula o RUC del cliente");
    }
    const email = cliente.email.trim();
    if (email !== "" && !email.includes("@")) {
      throw new Error("El email del cliente no es valido");
    }
  }

  /**
   * Reusa el cliente por cédula o email (cualquiera de los dos identifica a la
   * misma persona) para no duplicar filas en cada reserva.
   */
  private async obtenerOCrearCliente(datos: DatosClienteReserva): Promise<Cliente> {
    const nombres = datos.nombres.trim();
    const cedula = datos.cedula_ruc.trim();
    const email = datos.email.trim().toLowerCase();
    const telefono = datos.telefono?.trim() || null;

    const clientes = await this.clienteRepo.getAll();
    const existente = clientes.find(
      (c) => c.cedula_ruc === cedula || (email !== "" && (c.email ?? "").toLowerCase() === email),
    );
    if (existente) return existente;

    return this.clienteRepo.create({ nombres, cedula_ruc: cedula, email: datos.email.trim(), telefono });
  }

  private async revertirReserva(idLote: number, movimientosPrevios: Set<number>): Promise<boolean> {
    try {
      await this.lotRepo.updateEstado(idLote, "disponible");
      const movimientos = await this.inventarioRepo.getByLoteId(idLote);
      for (const movimiento of movimientos) {
        if (!movimientosPrevios.has(movimiento.id_inventario)) {
          await this.inventarioRepo.delete(movimiento.id_inventario);
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
