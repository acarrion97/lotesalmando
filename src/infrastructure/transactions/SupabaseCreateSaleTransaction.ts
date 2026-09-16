import type { CreateSaleCommand, CreateSaleTransaction, SaleResult } from "@/application/ventas/ports/CreateSaleTransaction";
import type { LotRepository } from "@/domain/lote/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { Venta } from "@/domain/venta/entities";
import type { Contrato } from "@/domain/contrato/entities";
import type { Cobranza } from "@/domain/cobranza/entities";

export class SupabaseCreateSaleTransaction implements CreateSaleTransaction {
  private lotRepo: LotRepository;
  private saleRepo: SaleRepository;
  private inventarioRepo: InventarioRepository;
  private contractRepo: ContractRepository;
  private cobranzaRepo: CobranzaRepository;
  constructor(
    lotRepo: LotRepository,
    saleRepo: SaleRepository,
    inventarioRepo: InventarioRepository,
    contractRepo: ContractRepository,
    cobranzaRepo: CobranzaRepository,
  ) {
    this.lotRepo = lotRepo;
    this.saleRepo = saleRepo;
    this.inventarioRepo = inventarioRepo;
    this.contractRepo = contractRepo;
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(command: CreateSaleCommand): Promise<SaleResult> {
    const lote = await this.lotRepo.getById(command.id_lote);
    if (!lote) throw new Error(`Lote ${command.id_lote} not found`);

    const estadoAnterior = lote.estado;

    const ventaPayload: Omit<Venta, "id_venta"> = {
      id_cliente: command.id_cliente,
      id_lote: command.id_lote,
      id_cotizacion: command.id_cotizacion,
      id_usuario: command.id_usuario,
      precio_final: command.precio_ofertado,
      estado: "completada",
    };
    const venta = await this.saleRepo.create(ventaPayload);

    await this.lotRepo.updateEstado(command.id_lote, "vendido");

    await this.inventarioRepo.create({
      id_lote: command.id_lote,
      id_usuario: command.id_usuario,
      estado_anterior: estadoAnterior,
      estado_nuevo: "vendido",
    });

    const contratoPayload: Omit<Contrato, "id_contrato"> = {
      id_venta: venta.id_venta,
      numero_contrato: `C-${Date.now()}`,
      monto_total: command.precio_ofertado,
    };
    const contrato = await this.contractRepo.create(contratoPayload);

    const totalCuotas = 12;
    const montoCuota = Math.ceil(command.precio_ofertado / totalCuotas);

    for (let i = 1; i <= totalCuotas; i++) {
      const cuotaPayload: Omit<Cobranza, "id_cobranza"> = {
        id_contrato: contrato.id_contrato,
        numero_cuota: i,
        monto_cuota: i === totalCuotas ? command.precio_ofertado - montoCuota * (totalCuotas - 1) : montoCuota,
        estado: "pendiente",
      };
      await this.cobranzaRepo.create(cuotaPayload);
    }

    return {
      id_venta: venta.id_venta,
      id_contrato: contrato.id_contrato,
      cuotas_generadas: totalCuotas,
    };
  }
}
