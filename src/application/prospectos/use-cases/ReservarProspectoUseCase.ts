import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { ReservarLoteUseCase } from "@/application/lotes/use-cases/ReservarLoteUseCase";
import type { RegistrarEntradaReservaUseCase } from "@/application/entradas/use-cases/RegistrarEntradaReservaUseCase";

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
  /** Entrada (seña) cobrada al reservar; omitirla o monto 0 = sin cobro. */
  entrada?: { monto: number } | null;
}

export interface ReservarProspectoResult {
  prospecto: Prospecto;
  /** Oportunidad de la reserva; en su snapshot `cliente_*` van los datos del reservante. */
  oportunidad: Oportunidad;
}

/**
 * Reserva de un lote disparada por el pipeline de prospectos (estado "reserva").
 *
 * Reservar NO crea un `cliente`: los datos capturados se guardan como un
 * snapshot en la oportunidad (etapa `reserva`) que ya liga prospecto ↔ lote, y
 * solo se copian a `cliente` cuando el lote pasa a "vendido"
 * (MaterializarClienteReservaUseCase). Así no se llena la tabla de clientes
 * con gente que reserva y nunca compra.
 *
 * Orquesta en orden: reserva del lote → entrada → oportunidad (con el
 * snapshot) → actualización del prospecto. No es transaccional, así que si
 * algo falla después de reservar el lote se compensa (el lote vuelve a
 * "disponible" y se borran los movimientos de inventario creados en esta
 * operación) para no dejar reservas huérfanas.
 */
export class ReservarProspectoUseCase {
  private readonly prospectoRepo: ProspectoRepository;
  private readonly lotRepo: LotRepository;
  private readonly inventarioRepo: InventarioRepository;
  private readonly oportunidadRepo: OportunidadRepository;
  private readonly reservarLote: ReservarLoteUseCase;
  private readonly registrarEntrada: RegistrarEntradaReservaUseCase;

  constructor(deps: {
    prospectoRepo: ProspectoRepository;
    lotRepo: LotRepository;
    inventarioRepo: InventarioRepository;
    oportunidadRepo: OportunidadRepository;
    reservarLote: ReservarLoteUseCase;
    registrarEntrada: RegistrarEntradaReservaUseCase;
  }) {
    this.prospectoRepo = deps.prospectoRepo;
    this.lotRepo = deps.lotRepo;
    this.inventarioRepo = deps.inventarioRepo;
    this.oportunidadRepo = deps.oportunidadRepo;
    this.reservarLote = deps.reservarLote;
    this.registrarEntrada = deps.registrarEntrada;
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

    // Marca los movimientos previos para poder deshacer solo los de esta
    // operación si algo falla después de la reserva.
    const movimientosPrevios = new Set(
      (await this.inventarioRepo.getByLoteId(input.idLote)).map((m) => m.id_inventario),
    );

    // ReservarLoteUseCase vuelve a validar la disponibilidad y registra inventario.
    await this.reservarLote.execute(input.idLote, input.usuarioId);

    let oportunidad: Oportunidad | null = null;
    let idEntrada: number | null = null;
    try {
      // Entrada (seña) opcional: se cobra después de reservar el lote. Si el
      // monto no está informado o es 0, la reserva avanza sin cobro.
      const montoEntrada = input.entrada?.monto ?? 0;
      if (montoEntrada > 0) {
        const entrada = await this.registrarEntrada.execute({
          idLote: input.idLote,
          idProspecto: prospecto.id_prospecto,
          idEmpresa: prospecto.id_empresa,
          idUsuario: input.usuarioId,
          monto: montoEntrada,
        });
        idEntrada = entrada.id_entrada;
      }

      // Los datos del cliente quedan como snapshot en la propia oportunidad de
      // la reserva. No se crea `cliente`: eso recién pasa al vender.
      oportunidad = await this.oportunidadRepo.create({
        id_empresa: prospecto.id_empresa,
        id_prospecto: prospecto.id_prospecto,
        id_lote: input.idLote,
        etapa: "reserva",
        valor_estimado: lote.precio_lista ?? 0,
        notas: "",
        cliente_nombres: input.cliente.nombres.trim(),
        cliente_cedula_ruc: input.cliente.cedula_ruc.trim(),
        cliente_email: input.cliente.email.trim(),
        cliente_telefono: input.cliente.telefono?.trim() || null,
      });

      const prospectoActualizado = await this.prospectoRepo.update(prospecto.id_prospecto, {
        estado: "reserva",
        fecha_ultimo_seguimiento: new Date().toISOString(),
        id_asesor: input.idAsesor,
      });

      return { prospecto: prospectoActualizado, oportunidad };
    } catch (error) {
      if (oportunidad) {
        await this.oportunidadRepo.delete(oportunidad.id_oportunidad).catch(() => undefined);
      }
      if (idEntrada !== null) {
        await this.registrarEntrada.remove(idEntrada).catch(() => undefined);
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
    // La cédula puede venir vacía cuando la reserva parte de un prospecto
    // (que no tiene cédula): si se informa, tiene que ser creíble.
    const cedula = cliente.cedula_ruc.trim();
    if (cedula !== "" && cedula.length < 5) {
      throw new Error("Ingrese la cedula o RUC del cliente");
    }
    const email = cliente.email.trim();
    if (email !== "" && !email.includes("@")) {
      throw new Error("El email del cliente no es valido");
    }
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
