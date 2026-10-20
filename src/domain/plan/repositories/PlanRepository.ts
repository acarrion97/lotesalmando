import type { Plan } from "../entities";

export interface PlanRepository {
  /** Todos los planes (incluye inactivos), ordenados por `orden`. */
  getAll(): Promise<Plan[]>;
  create(data: Omit<Plan, "id_plan">): Promise<Plan>;
  update(id: number, data: Partial<Plan>): Promise<Plan>;
  delete(id: number): Promise<void>;
}
