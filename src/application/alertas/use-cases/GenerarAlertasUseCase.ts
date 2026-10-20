import type { LotRepository } from "@/domain/lote/repositories";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { Cobranza } from "@/domain/cobranza/entities";
import type { Alerta } from "@/domain/alerta/entities";

export interface AlertasConfig {
  stockMinimo: number;
  horasSeguimiento: number;
  diasCarteraVencer: number;
}

const defaultConfig: AlertasConfig = {
  stockMinimo: 5,
  horasSeguimiento: 48,
  diasCarteraVencer: 7,
};

export class GenerarAlertasUseCase {
  private lotRepo: LotRepository;
  private prospectoRepo: ProspectoRepository;
  private cobranzaRepo: CobranzaRepository;
  private contractRepo: ContractRepository;
  private saleRepo: SaleRepository;
  private clienteRepo: ClienteRepository;
  private comprobanteRepo: ComprobanteRepository;

  constructor(
    lotRepo: LotRepository,
    prospectoRepo: ProspectoRepository,
    cobranzaRepo: CobranzaRepository,
    contractRepo: ContractRepository,
    saleRepo: SaleRepository,
    clienteRepo: ClienteRepository,
    comprobanteRepo: ComprobanteRepository,
  ) {
    this.lotRepo = lotRepo;
    this.prospectoRepo = prospectoRepo;
    this.cobranzaRepo = cobranzaRepo;
    this.contractRepo = contractRepo;
    this.saleRepo = saleRepo;
    this.clienteRepo = clienteRepo;
    this.comprobanteRepo = comprobanteRepo;
  }

  /**
   * Agrupa cuotas por cliente (cuota -> contrato -> venta -> cliente) y devuelve
   * una linea por cliente, de mayor a menor monto adeudado.
   */
  private async detalleCuotasPorCliente(cuotas: Cobranza[], empresaId?: number): Promise<string[]> {
    if (cuotas.length === 0) return [];
    const [contratos, ventas, clientes] = await Promise.all([
      empresaId ? this.contractRepo.getByEmpresaId(empresaId) : this.contractRepo.getAll(),
      empresaId ? this.saleRepo.getByEmpresaId(empresaId) : this.saleRepo.getAll(),
      empresaId ? this.clienteRepo.getByEmpresaId(empresaId) : this.clienteRepo.getAll(),
    ]);
    const ventaDeContrato = new Map(contratos.map((c) => [c.id_contrato, c.id_venta]));
    const clienteDeVenta = new Map(ventas.map((v) => [v.id_venta, v.id_cliente]));
    const nombreCliente = new Map(clientes.map((c) => [c.id_cliente, c.nombres.trim()]));

    const porCliente = new Map<string, { cuotas: number; centavos: number }>();
    for (const c of cuotas) {
      const idCliente = clienteDeVenta.get(ventaDeContrato.get(c.id_contrato) ?? -1);
      const nombre = (idCliente !== undefined && nombreCliente.get(idCliente)) || "Cliente sin identificar";
      const acc = porCliente.get(nombre) ?? { cuotas: 0, centavos: 0 };
      acc.cuotas += 1;
      acc.centavos += Math.round(c.monto_cuota * 100);
      porCliente.set(nombre, acc);
    }

    return [...porCliente.entries()]
      .sort((a, b) => b[1].centavos - a[1].centavos)
      .map(([nombre, { cuotas: n, centavos }]) =>
        `${nombre}: ${n} ${n === 1 ? "cuota" : "cuotas"} por $${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
  }

  async execute(config: AlertasConfig = defaultConfig, empresaId?: number): Promise<Alerta[]> {
    const alertas: Alerta[] = [];

    // 1. Alertas de inventario
    const lotes = empresaId
      ? await this.lotRepo.getByEmpresaId(empresaId)
      : await this.lotRepo.getAll();
    const disponibles = lotes.filter((l) => l.estado === "disponible").length;
    if (disponibles < config.stockMinimo) {
      alertas.push({
        id: `inv-${Date.now()}`,
        tipo: "inventario",
        prioridad: disponibles === 0 ? "alta" : "media",
        titulo: "Stock de lotes bajo",
        descripcion: `Solo quedan ${disponibles} lotes disponibles (umbral: ${config.stockMinimo})`,
        entidad_tipo: "lote",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    // 2. Alertas de seguimiento
    const prospectos = empresaId
      ? await this.prospectoRepo.getByEmpresaId(empresaId)
      : await this.prospectoRepo.getAll();
    const ahora = new Date();
    for (const p of prospectos) {
      if (!p.fecha_ultimo_seguimiento) continue;
      const ultimaActividad = new Date(p.fecha_ultimo_seguimiento);
      const horasDesde = (ahora.getTime() - ultimaActividad.getTime()) / (1000 * 60 * 60);
      if (horasDesde > config.horasSeguimiento) {
        alertas.push({
          id: `seg-${p.id_prospecto}-${Date.now()}`,
          tipo: "seguimiento",
          prioridad: horasDesde > 72 ? "alta" : "media",
          titulo: "Prospecto sin seguimiento",
          descripcion: `${p.nombres} lleva ${Math.round(horasDesde)}h sin actividad`,
          entidad_tipo: "prospecto",
          entidad_id: p.id_prospecto,
          created_at: new Date().toISOString(),
          leida: false,
        });
      }
    }

    // 3. Alertas de cartera por vencer
    const cobranzas = empresaId
      ? await this.cobranzaRepo.getByEmpresaId(empresaId)
      : await this.cobranzaRepo.getAll();
    const hoy = new Date();
    const en7Dias = new Date(hoy.getTime() + config.diasCarteraVencer * 24 * 60 * 60 * 1000);
    const porVencer = cobranzas.filter((c) => {
      if (c.estado !== "pendiente") return false;
      const fecha = new Date(c.fecha_vencimiento);
      return fecha >= hoy && fecha <= en7Dias;
    });
    if (porVencer.length > 0) {
      alertas.push({
        id: `car-vencer-${Date.now()}`,
        tipo: "cartera",
        prioridad: "media",
        titulo: "Cuotas por vencer",
        descripcion: `${porVencer.length} cuotas vencen en los proximos ${config.diasCarteraVencer} dias`,
        detalle: await this.detalleCuotasPorCliente(porVencer, empresaId),
        entidad_tipo: "cobranza",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    // 4. Alertas de morosidad
    const vencidas = cobranzas.filter((c) => c.estado === "vencida");
    if (vencidas.length > 0) {
      const montoVencido = vencidas.reduce((sum, c) => sum + Math.round(c.monto_cuota * 100), 0) / 100;
      alertas.push({
        id: `mora-${Date.now()}`,
        tipo: "mora",
        prioridad: vencidas.length > 5 ? "alta" : "media",
        titulo: "Cartera en mora",
        descripcion: `${vencidas.length} cuotas vencidas por $${montoVencido.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detalle: await this.detalleCuotasPorCliente(vencidas, empresaId),
        entidad_tipo: "cobranza",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    // 5. Comprobantes de pago esperando revision (los subio el cliente
    // desde el portal y todavia no se aprobo ni se rechazo).
    const comprobantes = empresaId
      ? await this.comprobanteRepo.getByEmpresaId(empresaId)
      : await this.comprobanteRepo.getAll();
    const pendientes = comprobantes.filter((c) => c.estado === "pendiente");
    if (pendientes.length > 0) {
      const [cobranzas, contratos, ventas, clientes] = await Promise.all([
        empresaId ? this.cobranzaRepo.getByEmpresaId(empresaId) : this.cobranzaRepo.getAll(),
        empresaId ? this.contractRepo.getByEmpresaId(empresaId) : this.contractRepo.getAll(),
        empresaId ? this.saleRepo.getByEmpresaId(empresaId) : this.saleRepo.getAll(),
        empresaId ? this.clienteRepo.getByEmpresaId(empresaId) : this.clienteRepo.getAll(),
      ]);
      const cuotaPorId = new Map(cobranzas.map((c) => [c.id_cobranza, c]));
      const ventaPorContrato = new Map(contratos.map((c) => [c.id_contrato, c.id_venta]));
      const clientePorVenta = new Map(ventas.map((v) => [v.id_venta, v.id_cliente]));
      const nombrePorCliente = new Map(clientes.map((c) => [c.id_cliente, c.nombres.trim()]));

      const detalle = pendientes.map((cp) => {
        const cuota = cuotaPorId.get(cp.id_cobranza);
        const idVenta = cuota ? ventaPorContrato.get(cuota.id_contrato) : undefined;
        const idCliente = idVenta !== undefined ? clientePorVenta.get(idVenta) : undefined;
        const nombre = (idCliente !== undefined && nombrePorCliente.get(idCliente)) || "Cliente sin identificar";
        const numero = cuota ? `cuota ${cuota.numero_cuota}` : "cuota";
        return `${nombre}: ${numero} por $${cp.monto_pagado.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      });

      alertas.push({
        id: `comp-${Date.now()}`,
        tipo: "comprobante",
        prioridad: pendientes.length > 3 ? "alta" : "media",
        titulo: "Comprobantes por revisar",
        descripcion: `${pendientes.length} comprobante(s) de pago esperando revision`,
        detalle,
        entidad_tipo: "comprobante",
        created_at: new Date().toISOString(),
        leida: false,
      });
    }

    return alertas;
  }
}
