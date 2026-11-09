import type { Cotizacion } from "../entities";

export interface CotizacionRepository {
  getAll(): Promise<Cotizacion[]>;
  getByEmpresaId(empresaId: number): Promise<Cotizacion[]>;
  getById(id: number): Promise<Cotizacion | null>;
  /** Todas las cotizaciones de un cliente (al eliminarlo se borran juntas). */
  getByClienteId(clienteId: number): Promise<Cotizacion[]>;
  create(data: Omit<Cotizacion, "id_cotizacion">): Promise<Cotizacion>;
  update(id: number, data: Partial<Cotizacion>): Promise<Cotizacion>;
  delete(id: number): Promise<void>;
}
