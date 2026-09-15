import type { Actividad } from "../entities";

export interface ActividadRepository {
  getByProspectoId(prospectoId: number): Promise<Actividad[]>;
  create(data: Omit<Actividad, "id_actividad" | "created_at">): Promise<Actividad>;
}
