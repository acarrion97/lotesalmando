import type {
  AceptarCotizacionCommand,
  AceptarCotizacionPort,
  ResultadoAceptacion,
} from "@/application/cotizaciones/ports/AceptarCotizacionPort";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import { calcularPlanCuotas } from "@/domain/cotizacion/services";

/**
 * Réplica en memoria de la RPC `aceptar_cotizacion` para el modo mock:
 * mismas validaciones, mismo orden y las mismas reglas de plan de cuotas
 * (`calcularPlanCuotas`). No es atómica como la RPC, pero el modo mock no
 * tiene transacciones.
 */
export class MockAceptarCotizacion implements AceptarCotizacionPort {
  private cotizacionRepo: CotizacionRepository;
  private lotRepo: LotRepository;
  private saleRepo: SaleRepository;
  private inventarioRepo: InventarioRepository;
  private contractRepo: ContractRepository;
  private cobranzaRepo: CobranzaRepository;

  constructor(
    cotizacionRepo: CotizacionRepository,
    lotRepo: LotRepository,
    saleRepo: SaleRepository,
    inventarioRepo: InventarioRepository,
    contractRepo: ContractRepository,
    cobranzaRepo: CobranzaRepository,
  ) {
    this.cotizacionRepo = cotizacionRepo;
    this.lotRepo = lotRepo;
    this.saleRepo = saleRepo;
    this.inventarioRepo = inventarioRepo;
    this.contractRepo = contractRepo;
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(command: AceptarCotizacionCommand): Promise<ResultadoAceptacion> {
    const cotizacion = await this.cotizacionRepo.getById(command.id_cotizacion);
    if (!cotizacion) throw new Error(`La cotización ${command.id_cotizacion} no existe`);
    if (cotizacion.estado === "aceptada") {
      throw new Error(`La cotización ${command.id_cotizacion} ya fue aceptada`);
    }
    if (cotizacion.monto_entrada >= cotizacion.precio_ofertado) {
      throw new Error("La entrada debe ser menor al precio ofertado");
    }
    if (cotizacion.num_cuotas < 1) throw new Error("El número de cuotas debe ser al menos 1");

    const lote = await this.lotRepo.getById(cotizacion.id_lote);
    if (!lote) throw new Error(`El lote ${cotizacion.id_lote} no existe`);
    const estadoAnterior = lote.estado;

    const venta = await this.saleRepo.create({
      id_cliente: cotizacion.id_cliente,
      id_lote: cotizacion.id_lote,
      id_cotizacion: cotizacion.id_cotizacion,
      id_usuario: command.id_usuario,
      precio_final: cotizacion.precio_ofertado,
      // Nace 'pendiente': pasa a 'completada' sola cuando todas sus cuotas
      // quedan pagadas (MockCobranzaRepository replica el trigger de 040).
      estado: "pendiente",
      id_asesor: cotizacion.id_asesor ?? null,
      created_at: new Date().toISOString(),
    });

    await this.lotRepo.updateEstado(cotizacion.id_lote, "vendido");

    await this.inventarioRepo.create({
      id_lote: cotizacion.id_lote,
      id_usuario: command.id_usuario,
      estado_anterior: estadoAnterior,
      estado_nuevo: "vendido",
    });

    const contrato = await this.contractRepo.create({
      id_venta: venta.id_venta,
      numero_contrato: `C-${Date.now()}`,
      monto_total: cotizacion.precio_ofertado,
    });

    const plan = calcularPlanCuotas(
      cotizacion.precio_ofertado,
      cotizacion.monto_entrada,
      cotizacion.num_cuotas,
    );
    for (const cuota of plan.cuotas) {
      await this.cobranzaRepo.create({
        id_contrato: contrato.id_contrato,
        numero_cuota: cuota.numero,
        monto_cuota: cuota.monto,
        estado: "pendiente",
        fecha_vencimiento: cuota.fecha_vencimiento,
      });
    }

    await this.cotizacionRepo.update(cotizacion.id_cotizacion, { estado: "aceptada" });

    return {
      id_venta: venta.id_venta,
      id_contrato: contrato.id_contrato,
      cuotas_generadas: plan.cuotas.length,
    };
  }
}
