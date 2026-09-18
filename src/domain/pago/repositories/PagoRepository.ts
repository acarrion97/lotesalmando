import type { Pago } from "../entities";

export interface PagoRepository {
  getAll(): Promise<Pago[]>;
  getByEmpresaId(empresaId: number): Promise<Pago[]>;
  getByCobranzaId(cobranzaId: number): Promise<Pago[]>;
  getById(id: number): Promise<Pago | null>;
  create(data: Omit<Pago, "id_pago">): Promise<Pago>;
}
