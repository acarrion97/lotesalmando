import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";

/**
 * Elimina un cliente y su historial comercial, siempre que NO tenga cuotas
 * asignadas.
 *
 * No existe relación directa cliente ↔ cobranza: la cadena es
 * cliente → ventas → contratos → cobranzas. Además las FK de `cotizador` y
 * `ventas` hacia `cliente` son `ON DELETE RESTRICT`, así que borrar solo la
 * fila del cliente fallaría; hay que borrar antes lo que apunta a él.
 *
 * Orden respetando las FK: contratos → ventas → cotizaciones → cliente.
 * (`comprobantes.id_cliente` es ON DELETE CASCADE y se limpia solo.)
 *
 * Guarda: si algún contrato tiene cuotas, NO se borra nada y se lanza un
 * error. `cobranzas` cuelga de `contratos` con CASCADE, así que sin esa
 * guarda un borrado directo destruiría el plan de cuotas (y sus pagos).
 */
export class DeleteClienteUseCase {
  private readonly clienteRepo: ClienteRepository;
  private readonly cotizacionRepo: CotizacionRepository;
  private readonly saleRepo: SaleRepository;
  private readonly contractRepo: ContractRepository;
  private readonly cobranzaRepo: CobranzaRepository;

  constructor(
    clienteRepo: ClienteRepository,
    cotizacionRepo: CotizacionRepository,
    saleRepo: SaleRepository,
    contractRepo: ContractRepository,
    cobranzaRepo: CobranzaRepository,
  ) {
    this.clienteRepo = clienteRepo;
    this.cotizacionRepo = cotizacionRepo;
    this.saleRepo = saleRepo;
    this.contractRepo = contractRepo;
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(id: number): Promise<void> {
    const ventas = await this.saleRepo.getByClienteId(id);
    const contratos = await this.contractRepo.getByVentaIds(ventas.map((v) => v.id_venta));

    // Primero se verifica TODO antes de borrar: si hay una sola cuota, el
    // cliente queda intacto (no se puede dejar a medias).
    for (const contrato of contratos) {
      const cuotas = await this.cobranzaRepo.getByContratoId(contrato.id_contrato);
      if (cuotas.length > 0) {
        throw new Error("No se puede eliminar el cliente: tiene cuotas asignadas");
      }
    }

    for (const contrato of contratos) {
      await this.contractRepo.delete(contrato.id_contrato);
    }
    for (const venta of ventas) {
      await this.saleRepo.delete(venta.id_venta);
    }
    for (const cotizacion of await this.cotizacionRepo.getByClienteId(id)) {
      await this.cotizacionRepo.delete(cotizacion.id_cotizacion);
    }

    await this.clienteRepo.delete(id);
  }
}
