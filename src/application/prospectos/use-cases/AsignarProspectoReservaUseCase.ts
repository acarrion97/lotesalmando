import type { LotRepository } from "@/domain/lote/repositories";
import type { Oportunidad } from "@/domain/oportunidad/entities";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { Prospecto } from "@/domain/prospecto/entities";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { RegistrarEntradaReservaUseCase } from "@/application/entradas/use-cases/RegistrarEntradaReservaUseCase";
import type { DatosClienteReserva } from "./ReservarProspectoUseCase";

export interface NuevoProspectoReserva {
  /** Origen comercial del prospecto (directo, referido, web...). */
  origen: string;
  notas?: string;
}

export interface AsignarProspectoReservaInput {
  idEmpresa: number;
  idLote: number;
  usuarioId: number;
  /** Asesor de la sesión; null cuando la cuenta no tiene asesor vinculado. */
  idAsesor: number | null;
  /** Prospecto existente a asignar. Se ignora si viene `nuevo`. */
  idProspecto?: number | null;
  /**
   * Datos propios del prospecto cuando hay que crearlo. El nombre, email y
   * teléfono salen del snapshot `cliente` para no pedirlos dos veces.
   */
  nuevo?: NuevoProspectoReserva | null;
  /** Snapshot que se guarda en la oportunidad y se usa al vender. */
  cliente: DatosClienteReserva;
  /** Entrada (seña) cobrada al asignar; omitirla o monto 0 = sin cobro. */
  entrada?: { monto: number } | null;
}

export interface AsignarProspectoReservaResult {
  prospecto: Prospecto;
  oportunidad: Oportunidad;
}

/**
 * Asigna un prospecto en etapa "reserva" a un lote que YA está reservado.
 *
 * `ReservarProspectoUseCase` sirve para reservar un lote disponible: cambia el
 * estado del lote y registra inventario. Acá el lote ya fue reservado (por
 * ejemplo desde Inventario o Lotes), así que solo falta la parte comercial:
 * dejar el prospecto en etapa "reserva" y crear/actualizar su oportunidad con
 * el snapshot del cliente. Ese snapshot es el que después usa "Realizar venta".
 *
 * Si el prospecto no existe todavía, se crea con los datos del formulario y,
 * si algo falla después, se compensa borrándolo para no dejar basura.
 */
export class AsignarProspectoReservaUseCase {
  private readonly prospectoRepo: ProspectoRepository;
  private readonly lotRepo: LotRepository;
  private readonly oportunidadRepo: OportunidadRepository;
  private readonly registrarEntrada: RegistrarEntradaReservaUseCase;

  constructor(deps: {
    prospectoRepo: ProspectoRepository;
    lotRepo: LotRepository;
    oportunidadRepo: OportunidadRepository;
    registrarEntrada: RegistrarEntradaReservaUseCase;
  }) {
    this.prospectoRepo = deps.prospectoRepo;
    this.lotRepo = deps.lotRepo;
    this.oportunidadRepo = deps.oportunidadRepo;
    this.registrarEntrada = deps.registrarEntrada;
  }

  async execute(input: AsignarProspectoReservaInput): Promise<AsignarProspectoReservaResult> {
    this.validarCliente(input.cliente);

    const lote = await this.lotRepo.getById(input.idLote);
    if (!lote) throw new Error(`Lote ${input.idLote} no encontrado`);
    if (lote.estado !== "reservado") {
      throw new Error(
        `Solo se puede asignar un prospecto a un lote reservado (estado actual: ${lote.estado})`,
      );
    }

    // Se valida antes de escribir nada: si el monto no es válido, la reserva
    // queda intacta y el usuario solo corrige el formulario.
    const montoEntrada = input.entrada?.monto ?? 0;
    if (!Number.isFinite(montoEntrada) || montoEntrada < 0) {
      throw new Error("El monto de la entrada no es válido");
    }
    if (montoEntrada > 0 && montoEntrada > (lote.precio_lista ?? 0)) {
      throw new Error("La entrada no puede superar el precio de lista del lote");
    }

    let prospecto: Prospecto | null = null;
    let creado = false;

    if (input.idProspecto != null) {
      prospecto = await this.prospectoRepo.getById(input.idProspecto);
      if (!prospecto) throw new Error("El prospecto seleccionado ya no existe");
      if (prospecto.id_empresa !== input.idEmpresa) {
        throw new Error("El prospecto seleccionado pertenece a otra empresa");
      }
      if (prospecto.estado === "reserva") {
        throw new Error(`${prospecto.nombres} ya se encuentra en etapa Reserva`);
      }
      if (prospecto.estado === "perdido") {
        throw new Error(`${prospecto.nombres} está marcado como perdido; reactívelo antes de reservar`);
      }
    } else if (input.nuevo) {
      prospecto = await this.prospectoRepo.create({
        id_empresa: input.idEmpresa,
        id_asesor: input.idAsesor,
        nombres: input.cliente.nombres.trim(),
        email: input.cliente.email.trim(),
        telefono: input.cliente.telefono?.trim() ?? "",
        origen: input.nuevo.origen?.trim() || "directo",
        estado: "nuevo",
        notas: input.nuevo.notas?.trim() ?? "",
        fecha_ultimo_seguimiento: null,
      });
      creado = true;
    } else {
      throw new Error("Seleccione un prospecto existente o cargue los datos de uno nuevo");
    }

    const datosCliente = {
      cliente_nombres: input.cliente.nombres.trim(),
      cliente_cedula_ruc: input.cliente.cedula_ruc.trim(),
      cliente_email: input.cliente.email.trim(),
      cliente_telefono: input.cliente.telefono?.trim() || null,
    };

    let oportunidad: Oportunidad | null = null;
    let oportunidadCreada = false;
    let idEntrada: number | null = null;

    try {
      // Si el lote ya tenía una reserva (p. ej. quedó huérfana porque el
      // prospecto pasó a "perdido"), se reutiliza esa oportunidad en vez de
      // crear una segunda para el mismo lote.
      const reservasDelLote = (await this.oportunidadRepo.getByLoteId(input.idLote)).filter(
        (o) => o.etapa === "reserva",
      );
      const base =
        reservasDelLote.find((o) => o.id_prospecto === prospecto!.id_prospecto) ??
        reservasDelLote[0];

      if (base) {
        oportunidad = await this.oportunidadRepo.update(base.id_oportunidad, {
          id_prospecto: prospecto.id_prospecto,
          etapa: "reserva",
          valor_estimado: lote.precio_lista ?? 0,
          ...datosCliente,
        });
      } else {
        oportunidad = await this.oportunidadRepo.create({
          id_empresa: input.idEmpresa,
          id_prospecto: prospecto.id_prospecto,
          id_lote: input.idLote,
          etapa: "reserva",
          valor_estimado: lote.precio_lista ?? 0,
          notas: "",
          ...datosCliente,
        });
        oportunidadCreada = true;
      }

      const actualizado = await this.prospectoRepo.update(prospecto.id_prospecto, {
        estado: "reserva",
        fecha_ultimo_seguimiento: new Date().toISOString(),
        id_asesor: input.idAsesor,
      });

      // Entrada (seña) opcional, igual que al reservar desde Prospectos: se
      // registra al final para no cobrarla si la reserva no se pudo completar.
      if (montoEntrada > 0) {
        const entrada = await this.registrarEntrada.execute({
          idLote: input.idLote,
          idProspecto: prospecto.id_prospecto,
          idEmpresa: input.idEmpresa,
          idUsuario: input.usuarioId,
          monto: montoEntrada,
        });
        idEntrada = entrada.id_entrada;
      }

      return { prospecto: actualizado, oportunidad };
    } catch (error) {
      if (idEntrada !== null) {
        await this.registrarEntrada.remove(idEntrada).catch(() => undefined);
      }
      if (oportunidadCreada && oportunidad) {
        await this.oportunidadRepo.delete(oportunidad.id_oportunidad).catch(() => undefined);
      }
      if (creado && prospecto) {
        await this.prospectoRepo.delete(prospecto.id_prospecto).catch(() => undefined);
      }
      throw error;
    }
  }

  private validarCliente(cliente: DatosClienteReserva): void {
    if (cliente.nombres.trim().length < 2) {
      throw new Error("Ingrese el nombre del cliente");
    }
    const cedula = cliente.cedula_ruc.trim();
    if (cedula !== "" && cedula.length < 5) {
      throw new Error("Ingrese la cedula o RUC del cliente");
    }
    const email = cliente.email.trim();
    if (email !== "" && !email.includes("@")) {
      throw new Error("El email del cliente no es valido");
    }
  }
}
