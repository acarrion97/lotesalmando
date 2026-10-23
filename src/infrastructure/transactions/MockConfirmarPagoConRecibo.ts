import type {
  ConfirmarPagoConRecibo,
  ConfirmarPagoConReciboInput,
  PagoConfirmadoConRecibo,
} from "@/application/recibos/ports/ConfirmarPagoConRecibo";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ConfiguracionContratoRepository } from "@/domain/configuracion/repositories";
import type { Recibo } from "@/domain/recibo/entities";
import { MockReciboRepository } from "@/infrastructure/repositories/mock/MockReciboRepository";

export class MockConfirmarPagoConRecibo implements ConfirmarPagoConRecibo {
  private readonly cobranzas: CobranzaRepository;
  private readonly pagos: PagoRepository;
  private readonly comprobantes: ComprobanteRepository;
  private readonly recibos: MockReciboRepository;
  private readonly configuracion: ConfiguracionContratoRepository;
  private readonly contratos: ContractRepository;
  private readonly ventas: SaleRepository;
  private readonly clientes: ClienteRepository;
  private readonly lotes: LotRepository;
  private readonly manzanas: ManzanaRepository;
  private readonly etapas: EtapaRepository;
  private readonly proyectos: ProyectoRepository;
  private readonly empresas: EmpresaRepository;

  constructor(
    cobranzas: CobranzaRepository,
    pagos: PagoRepository,
    comprobantes: ComprobanteRepository,
    recibos: MockReciboRepository,
    configuracion: ConfiguracionContratoRepository,
    contratos: ContractRepository,
    ventas: SaleRepository,
    clientes: ClienteRepository,
    lotes: LotRepository,
    manzanas: ManzanaRepository,
    etapas: EtapaRepository,
    proyectos: ProyectoRepository,
    empresas: EmpresaRepository,
  ) {
    this.cobranzas = cobranzas;
    this.pagos = pagos;
    this.comprobantes = comprobantes;
    this.recibos = recibos;
    this.configuracion = configuracion;
    this.contratos = contratos;
    this.ventas = ventas;
    this.clientes = clientes;
    this.lotes = lotes;
    this.manzanas = manzanas;
    this.etapas = etapas;
    this.proyectos = proyectos;
    this.empresas = empresas;
  }

  async execute(input: ConfirmarPagoConReciboInput): Promise<PagoConfirmadoConRecibo> {
    const cobranza = await this.cobranzas.getById(input.id_cobranza);
    if (!cobranza) throw new Error("No encontramos la cuota a pagar");
    if (cobranza.estado === "pagada") throw new Error("La cuota ya tiene un pago registrado");
    const pagosPrevios = await this.pagos.getByCobranzaId(input.id_cobranza);
    if (pagosPrevios.length) throw new Error("La cuota ya tiene un pago registrado");

    const contrato = await this.contratos.getById(cobranza.id_contrato);
    if (!contrato) throw new Error("No se encontró el contrato de la cuota");
    const venta = await this.ventas.getById(contrato.id_venta);
    if (!venta) throw new Error("No se encontró la venta del contrato");
    const cliente = await this.clientes.getById(venta.id_cliente);
    const lote = await this.lotes.getById(venta.id_lote);
    if (!cliente || !lote) throw new Error("No se encontraron los datos del cliente y lote");
    const manzana = await this.manzanas.getById(lote.id_manzana);
    if (!manzana) throw new Error("No se encontró la manzana del lote");
    const etapa = await this.etapas.getById(manzana.id_etapa);
    if (!etapa) throw new Error("No se encontró la etapa del lote");
    const proyecto = await this.proyectos.getById(etapa.id_proyecto);
    if (!proyecto) throw new Error("No se encontró el proyecto del lote");
    const empresa = await this.empresas.getById(proyecto.id_empresa);
    if (!empresa) throw new Error("No se encontró la empresa emisora");
    const config = await this.configuracion.getByProyectoId(proyecto.id_proyecto);

    const razonSocial = config?.razon_social?.trim() || empresa.razon_social;
    const ruc = config?.ruc?.trim() || empresa.ruc?.trim();
    const direccionMatriz = config?.direccion_matriz?.trim();
    const direccionEstablecimiento = config?.direccion_establecimiento?.trim();
    if (!razonSocial || !ruc || !direccionMatriz || !direccionEstablecimiento) {
      throw new Error("Complete razón social, RUC y direcciones fiscales del proyecto antes de confirmar el pago");
    }

    const identificacion = (cliente.cedula_ruc ?? "").replace(/\D/g, "");
    let tipo: Recibo["receptor_tipo_identificacion"];
    let numero: string;
    let receptor = cliente.nombres;
    if (!identificacion) {
      tipo = "07";
      numero = "9999999999999";
      receptor = "CONSUMIDOR FINAL";
    } else if (identificacion.length === 10) {
      tipo = "05";
      numero = identificacion;
    } else if (identificacion.length === 13) {
      tipo = "04";
      numero = identificacion;
    } else {
      throw new Error("La identificación del cliente debe tener 10 dígitos, 13 dígitos o estar vacía");
    }

    const codigoEstablecimiento = config?.codigo_establecimiento ?? "001";
    const puntoEmision = config?.punto_emision ?? "001";
    if (!/^\d{3}$/.test(codigoEstablecimiento) || !/^\d{3}$/.test(puntoEmision)) {
      throw new Error("Los códigos de establecimiento y punto de emisión deben contener tres dígitos");
    }
    const monto = Math.round(input.monto_pagado * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto pagado debe ser mayor a cero");
    const subtotal = Math.round((monto / 1.15) * 100) / 100;
    const iva = Math.round((monto - subtotal) * 100) / 100;
    const pago = await this.pagos.create({
      id_cobranza: input.id_cobranza,
      id_usuario: input.id_usuario,
      monto_pagado: monto,
      fecha_pago: input.fecha_pago.slice(0, 10),
      forma_pago: input.forma_pago,
    });
    await this.cobranzas.updateEstado(input.id_cobranza, "pagada");

    let comprobante = null;
    if (input.id_comprobante !== undefined) {
      comprobante = await this.comprobantes.revisar(
        input.id_comprobante,
        { estado: "aprobado" },
        input.id_usuario,
      );
    }

    // La secuencia vive en el repositorio: así la emisión de pagos viejos
    // (MockEmitirReciboPagoPrevio) comparte la misma numeración.
    const secuencia = this.recibos.siguienteSecuencia();
    const recibo: Recibo = {
      id_recibo: secuencia,
      id_empresa: proyecto.id_empresa,
      id_proyecto: proyecto.id_proyecto,
      id_pago: pago.id_pago,
      id_cobranza: cobranza.id_cobranza,
      numero_recibo: `${codigoEstablecimiento}-${puntoEmision}-${String(secuencia).padStart(9, "0")}`,
      secuencia,
      fecha_emision: pago.fecha_pago,
      emisor_razon_social: razonSocial,
      emisor_ruc: ruc,
      emisor_direccion_matriz: direccionMatriz,
      emisor_direccion_establecimiento: direccionEstablecimiento,
      codigo_establecimiento: codigoEstablecimiento,
      punto_emision: puntoEmision,
      receptor_nombre: receptor,
      receptor_tipo_identificacion: tipo,
      receptor_identificacion: numero,
      detalle: `Pago de cuota ${cobranza.numero_cuota} del contrato ${contrato.numero_contrato}, lote ${lote.numero_lote}, proyecto ${proyecto.nombre}`,
      subtotal,
      porcentaje_iva: 15,
      iva,
      total: monto,
      forma_pago: input.forma_pago,
      created_at: new Date().toISOString(),
    };
    this.recibos.save(recibo);
    return { pago, recibo, comprobante };
  }
}
