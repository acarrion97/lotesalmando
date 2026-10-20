import { supabase } from "@/infrastructure/supabase/client";
import type { ProyectoMedio, ProyectoMedioTipo } from "@/domain/proyecto/entities";
import type {
  AddProyectoMedioInput,
  ProyectoMedioRepository,
} from "@/domain/proyecto/repositories";

interface ProyectoMedioRow {
  id_proyecto_medio: number;
  id_proyecto: number;
  tipo: ProyectoMedioTipo;
  url: string;
  orden: number;
}

export class SupabaseProyectoMedioRepository implements ProyectoMedioRepository {
  async getByProyectoId(proyectoId: number): Promise<ProyectoMedio[]> {
    if (!proyectoId) return [];
    const { data, error } = await supabase
      .from("proyecto_medios")
      .select("*")
      .eq("id_proyecto", proyectoId)
      .order("orden", { ascending: false })
      .order("id_proyecto_medio", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProyectoMedioRow[];
  }

  async add(data: AddProyectoMedioInput): Promise<ProyectoMedio> {
    // `orden` es un contador por proyecto, no un timestamp: un timestamp en
    // milisegundos no cabe en una columna `integer` (2.147.483.647). Dos
    // subidas casi simultáneas pueden repetir el número, así que el
    // desempate lo da el `id` descendente que ya usan las consultas.
    const { data: ultimo, error: errorUltimo } = await supabase
      .from("proyecto_medios")
      .select("orden")
      .eq("id_proyecto", data.id_proyecto)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errorUltimo) throw errorUltimo;

    const fila = { ...data, orden: (ultimo?.orden ?? 0) + 1 };
    const { data: creada, error } = await supabase.from("proyecto_medios").insert(fila).select().single();
    if (error) throw error;
    return creada as ProyectoMedio;
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from("proyecto_medios").delete().eq("id_proyecto_medio", id);
    if (error) throw error;
  }
}
