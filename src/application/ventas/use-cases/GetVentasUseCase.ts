import type { Venta } from "@/domain/venta/entities";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { VentaDto } from "../dto/VentaDto";

export class GetVentasUseCase {
  private saleRepo: SaleRepository;
  constructor(saleRepo: SaleRepository) {
    this.saleRepo = saleRepo;
  }

  async execute(empresaId?: number): Promise<VentaDto[]> {
    const ventas: Venta[] = empresaId
      ? await this.saleRepo.getByEmpresaId(empresaId)
      : await this.saleRepo.getAll();
    return ventas.map((v) => this.toDto(v));
  }

  private toDto(venta: Venta): VentaDto {
    return {
      id_venta: venta.id_venta,
      id_cliente: venta.id_cliente,
      id_lote: venta.id_lote,
      id_cotizacion: venta.id_cotizacion,
      id_usuario: venta.id_usuario,
      precio_final: venta.precio_final,
      estado: venta.estado,
      created_at: venta.created_at,
      id_asesor: venta.id_asesor ?? null,
    };
  }
}
