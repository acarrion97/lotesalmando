import type { EntradaReserva } from "@/domain/entrada/entities";
import type { EntradaReservaRepository } from "@/domain/entrada/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { EntradaReservaDto } from "../dto/EntradaReservaDto";

export interface RegistrarEntradaReservaInput {
  idLote: number;
  idProspecto: number | null;
  idEmpresa: number | null;
  idUsuario: number;
  /** Importe cobrado; debe ser mayor a 0 y no superar el precio de lista. */
  monto: number;
  /** Fecha del cobro en ISO; si no se informa se usa hoy. */
  fechaPago?: string;
}

/**
 * Registra la entrada (seña) cobrada al reservar un lote.
 *
 * A diferencia de RegisterPagoUseCase, no apunta a una cobranza (la reserva no
 * genera cuotas todavía): se guarda en entradas_reserva ligada al lote. Valida
 * contra el precio de lista para no cobrar de más.
 */
export class RegistrarEntradaReservaUseCase {
  private entradaRepo: EntradaReservaRepository;
  private lotRepo: LotRepository;

  constructor(entradaRepo: EntradaReservaRepository, lotRepo: LotRepository) {
    this.entradaRepo = entradaRepo;
    this.lotRepo = lotRepo;
  }

  async execute(input: RegistrarEntradaReservaInput): Promise<EntradaReservaDto> {
    if (!Number.isFinite(input.monto) || input.monto <= 0) {
      throw new Error("El monto de la entrada debe ser mayor a 0");
    }

    const lote = await this.lotRepo.getById(input.idLote);
    if (!lote) throw new Error(`Lote ${input.idLote} no encontrado`);

    const precio = lote.precio_lista ?? 0;
    if (precio > 0 && input.monto > precio) {
      throw new Error("La entrada no puede superar el precio de lista del lote");
    }

    const entrada: EntradaReserva = await this.entradaRepo.create({
      id_lote: input.idLote,
      id_prospecto: input.idProspecto,
      id_empresa: input.idEmpresa,
      id_usuario: input.idUsuario,
      monto: input.monto,
      fecha_pago: input.fechaPago ?? new Date().toISOString().slice(0, 10),
    });

    return this.toDto(entrada);
  }

  /** Borra una entrada ya registrada; se usa para compensar reservas que fallan. */
  async remove(idEntrada: number): Promise<void> {
    await this.entradaRepo.delete(idEntrada);
  }

  private toDto(entrada: EntradaReserva): EntradaReservaDto {
    return {
      id_entrada: entrada.id_entrada,
      id_lote: entrada.id_lote,
      id_prospecto: entrada.id_prospecto,
      id_empresa: entrada.id_empresa,
      id_usuario: entrada.id_usuario,
      monto: entrada.monto,
      fecha_pago: entrada.fecha_pago,
    };
  }
}
