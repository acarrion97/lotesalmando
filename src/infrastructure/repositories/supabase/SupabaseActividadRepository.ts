import { supabase } from "@/infrastructure/supabase/client";
import type { Actividad } from "@/domain/actividad/entities";
import type { ActividadRepository } from "@/domain/actividad/repositories";

export class SupabaseActividadRepository implements ActividadRepository {
  async getByProspectoId(prospectoId: number): Promise<Actividad[]> {
    const { data, error } = await supabase.from("actividades").select("*").eq("id_prospecto", prospectoId).order("fecha_actividad", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Actividad[];
  }

  async create(data: Omit<Actividad, "id_actividad" | "created_at">): Promise<Actividad> {
    const { data: created, error } = await supabase.from("actividades").insert(data).select().single();
    if (error) throw error;
    return created as Actividad;
  }
}
