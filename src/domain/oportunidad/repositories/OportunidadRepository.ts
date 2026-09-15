import type { Oportunidad } from "../entities";

export interface OportunidadRepository {
  getAll(): Promise<Oportunidad[]>;
  getByProspectoId(prospectoId: number): Promise<Oportunidad[]>;
  getById(id: number): Promise<Oportunidad | null>;
  create(data: Omit<Oportunidad, "id_oportunidad" | "created_at">): Promise<Oportunidad>;
  update(id: number, data: Partial<Oportunidad>): Promise<Oportunidad>;
  delete(id: number): Promise<void>;
}
