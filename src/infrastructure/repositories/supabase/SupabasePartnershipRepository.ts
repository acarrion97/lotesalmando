import { supabase } from "@/infrastructure/supabase/client";
import type { Partnership } from "@/domain/partnership/entities";
import type { PartnershipRepository } from "@/domain/partnership/repositories";

export class SupabasePartnershipRepository implements PartnershipRepository {
  async getAll(): Promise<Partnership[]> {
    const { data, error } = await supabase.from("partnership").select("*").order("nombre");
    if (error) throw error;
    return (data ?? []) as Partnership[];
  }

  async getByCodigo(codigo: string): Promise<Partnership | null> {
    const { data, error } = await supabase
      .from("partnership")
      .select("*")
      .eq("codigo", codigo.trim().toUpperCase())
      .maybeSingle();
    if (error) return null;
    return (data as Partnership) ?? null;
  }

  async create(data: Omit<Partnership, "id_partner" | "created_at">): Promise<Partnership> {
    const { data: created, error } = await supabase.from("partnership").insert(data).select().single();
    if (error) throw error;
    return created as Partnership;
  }

  async update(id: number, data: Partial<Partnership>): Promise<Partnership> {
    const { data: updated, error } = await supabase
      .from("partnership")
      .update(data)
      .eq("id_partner", id)
      .select()
      .single();
    if (error) throw error;
    return updated as Partnership;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("partnership").delete().eq("id_partner", id);
    if (error) throw error;
  }
}
