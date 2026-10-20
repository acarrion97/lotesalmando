import type { Partnership } from "../entities";

export interface PartnershipRepository {
  getAll(): Promise<Partnership[]>;
  /** Busca por codigo (mayusculas). Devuelve null si no existe. */
  getByCodigo(codigo: string): Promise<Partnership | null>;
  create(data: Omit<Partnership, "id_partner" | "created_at">): Promise<Partnership>;
  update(id: number, data: Partial<Partnership>): Promise<Partnership>;
  delete(id: number): Promise<void>;
}
