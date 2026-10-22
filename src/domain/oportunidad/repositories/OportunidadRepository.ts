import type { Oportunidad } from "../entities";

export interface OportunidadRepository {
  getAll(): Promise<Oportunidad[]>;
  getByEmpresaId(empresaId: number): Promise<Oportunidad[]>;
  getByProspectoId(prospectoId: number): Promise<Oportunidad[]>;
  /** Oportunidades que apuntan a un lote (p. ej. la reserva activa con `etapa = 'reserva'`). */
  getByLoteId(loteId: number): Promise<Oportunidad[]>;
  getById(id: number): Promise<Oportunidad | null>;
  create(data: Omit<Oportunidad, "id_oportunidad" | "created_at">): Promise<Oportunidad>;
  update(id: number, data: Partial<Oportunidad>): Promise<Oportunidad>;
  delete(id: number): Promise<void>;
}
