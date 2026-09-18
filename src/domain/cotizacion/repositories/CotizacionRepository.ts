import type { Cotizacion } from "../entities";

export interface CotizacionRepository {
  getAll(): Promise<Cotizacion[]>;
  getByEmpresaId(empresaId: number): Promise<Cotizacion[]>;
  getById(id: number): Promise<Cotizacion | null>;
  create(data: Omit<Cotizacion, "id_cotizacion">): Promise<Cotizacion>;
  update(id: number, data: Partial<Cotizacion>): Promise<Cotizacion>;
}
