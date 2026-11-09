import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import { normalizarIdentificacion } from "@/domain/cliente/normalizarIdentificacion";
import { clientes } from "@/mocks/clientes.mock";
import type { MockCobranzaRepository } from "./MockCobranzaRepository";
import type { MockComprobanteRepository } from "./MockComprobanteRepository";
import type { MockContractRepository } from "./MockContractRepository";
import type { MockCotizacionRepository } from "./MockCotizacionRepository";
import type { MockPagoRepository } from "./MockPagoRepository";
import type { MockReciboRepository } from "./MockReciboRepository";
import type { MockSaleRepository } from "./MockSaleRepository";

export class MockClienteRepository implements ClienteRepository {
  private data: Cliente[] = [...clientes];
  private readonly cotizacionRepo: MockCotizacionRepository;
  private readonly saleRepo: MockSaleRepository;
  private readonly contractRepo: MockContractRepository;
  private readonly cobranzaRepo: MockCobranzaRepository;
  private readonly pagoRepo: MockPagoRepository;
  private readonly reciboRepo: MockReciboRepository;
  private readonly comprobanteRepo: MockComprobanteRepository;

  constructor(
    cotizacionRepo: MockCotizacionRepository,
    saleRepo: MockSaleRepository,
    contractRepo: MockContractRepository,
    cobranzaRepo: MockCobranzaRepository,
    pagoRepo: MockPagoRepository,
    reciboRepo: MockReciboRepository,
    comprobanteRepo: MockComprobanteRepository,
  ) {
    this.cotizacionRepo = cotizacionRepo;
    this.saleRepo = saleRepo;
    this.contractRepo = contractRepo;
    this.cobranzaRepo = cobranzaRepo;
    this.pagoRepo = pagoRepo;
    this.reciboRepo = reciboRepo;
    this.comprobanteRepo = comprobanteRepo;
  }

  async getAll(): Promise<Cliente[]> {
    return [...this.data];
  }

  async getByEmpresaId(empresaId: number): Promise<Cliente[]> {
    return this.data.filter((cliente) => cliente.id_empresa === empresaId);
  }

  async getById(id: number): Promise<Cliente | null> {
    return this.data.find((c) => c.id_cliente === id) ?? null;
  }

  async create(data: Omit<Cliente, "id_cliente">): Promise<Cliente> {
    const identificacion = normalizarIdentificacion(data.cedula_ruc);
    if (
      identificacion &&
      this.data.some(
        (cliente) =>
          cliente.id_empresa === data.id_empresa &&
          normalizarIdentificacion(cliente.cedula_ruc) === identificacion,
      )
    ) {
      throw new Error("Ya existe un cliente con esa cédula o RUC en esta empresa");
    }
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_cliente)) + 1 : 1;
    const cliente: Cliente = { ...data, id_cliente: newId };
    this.data.push(cliente);
    return cliente;
  }

  async update(id: number, data: Partial<Cliente>): Promise<Cliente> {
    const index = this.data.findIndex((c) => c.id_cliente === id);
    if (index === -1) throw new Error(`Cliente ${id} not found`);
    const identificacion = normalizarIdentificacion(data.cedula_ruc ?? this.data[index].cedula_ruc);
    if (
      identificacion &&
      this.data.some(
        (cliente) =>
          cliente.id_cliente !== id &&
          cliente.id_empresa === (data.id_empresa ?? this.data[index].id_empresa) &&
          normalizarIdentificacion(cliente.cedula_ruc) === identificacion,
      )
    ) {
      throw new Error("Ya existe un cliente con esa cédula o RUC en esta empresa");
    }
    this.data[index] = { ...this.data[index], ...data, id_cliente: id };
    return this.data[index];
  }

  async delete(id: number, _motivo: string, _idUsuario: number) {
    const cliente = this.data.find((c) => c.id_cliente === id);
    if (!cliente) throw new Error(`Cliente ${id} not found`);
    const ventas = await this.saleRepo.getByClienteId(id);
    const contratos = await this.contractRepo.getByVentaIds(ventas.map((v) => v.id_venta));
    const comprobantes = await this.comprobanteRepo.getByClienteId(id);

    await this.comprobanteRepo.deleteByClienteId(id);
    for (const contrato of contratos) {
      for (const cuota of await this.cobranzaRepo.getByContratoId(contrato.id_contrato)) {
        for (const pago of await this.pagoRepo.getByCobranzaId(cuota.id_cobranza)) {
          this.reciboRepo.deleteByPagoId(pago.id_pago);
          await this.pagoRepo.delete(pago.id_pago);
        }
      }
      await this.cobranzaRepo.deleteByContratoId(contrato.id_contrato);
      await this.contractRepo.delete(contrato.id_contrato);
    }
    for (const venta of ventas) await this.saleRepo.delete(venta.id_venta);
    for (const cotizacion of await this.cotizacionRepo.getByClienteId(id)) {
      await this.cotizacionRepo.delete(cotizacion.id_cotizacion);
    }

    this.data = this.data.filter((c) => c.id_cliente !== id);
    return {
      documentosContrato: contratos.flatMap((contrato) =>
        contrato.documento_url ? [contrato.documento_url] : [],
      ),
      comprobantes: comprobantes.map((comprobante) => comprobante.archivo_url),
    };
  }
}
