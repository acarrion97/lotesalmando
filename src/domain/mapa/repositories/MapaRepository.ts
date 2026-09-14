import type { Mapa } from "../entities";

export interface MapaRepository {
  getAll(): Promise<Mapa[]>;
  getByProyectoId(proyectoId: number): Promise<Mapa[]>;
  getById(id: number): Promise<Mapa | null>;
  create(data: Omit<Mapa, "id_mapa">): Promise<Mapa>;
  update(id: number, data: Partial<Mapa>): Promise<Mapa>;
  delete(id: number): Promise<void>;
}
