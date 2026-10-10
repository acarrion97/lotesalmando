import type { EntradaReserva } from "../entities";

export interface EntradaReservaRepository {
  getById(id: number): Promise<EntradaReserva | null>;
  getByLoteId(loteId: number): Promise<EntradaReserva[]>;
  getByEmpresaId(empresaId: number): Promise<EntradaReserva[]>;
  create(data: Omit<EntradaReserva, "id_entrada" | "created_at">): Promise<EntradaReserva>;
  delete(id: number): Promise<void>;
}
