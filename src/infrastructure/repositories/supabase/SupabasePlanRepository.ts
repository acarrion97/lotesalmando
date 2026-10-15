import { supabase } from "@/infrastructure/supabase/client";
import type { Plan } from "@/domain/plan/entities";
import type { PlanRepository } from "@/domain/plan/repositories";

export class SupabasePlanRepository implements PlanRepository {
  async getAll(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from("plan")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Plan[];
  }

  async create(data: Omit<Plan, "id_plan">): Promise<Plan> {
    const { data: created, error } = await supabase.from("plan").insert(data).select().single();
    if (error) throw error;
    return created as Plan;
  }

  async update(id: number, data: Partial<Plan>): Promise<Plan> {
    const { data: updated, error } = await supabase
      .from("plan")
      .update(data)
      .eq("id_plan", id)
      .select()
      .single();
    if (error) throw error;
    return updated as Plan;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("plan").delete().eq("id_plan", id);
    if (error) throw error;
  }
}
