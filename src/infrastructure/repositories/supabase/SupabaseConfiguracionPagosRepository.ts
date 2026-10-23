import { supabase } from "@/infrastructure/supabase/client";
import type { ConfiguracionPagos } from "@/domain/configuracion/entities";
import type {
  ConfiguracionPagosRepository,
  SaveConfiguracionPagosInput,
} from "@/domain/configuracion/repositories";

export class SupabaseConfiguracionPagosRepository implements ConfiguracionPagosRepository {
  async getByProyectoId(idProyecto: number): Promise<ConfiguracionPagos | null> {
    const { data, error } = await supabase
      .from("configuracion_pagos")
      .select("*")
      .eq("id_proyecto", idProyecto)
      .maybeSingle();
    if (error) throw error;
    return (data as ConfiguracionPagos | null) ?? null;
  }

  async save(data: SaveConfiguracionPagosInput): Promise<ConfiguracionPagos> {
    // `configuracion_pagos` tiene UNIQUE (id_empresa, id_proyecto):
    // una sola fila por proyecto.
    const { data: saved, error } = await supabase
      .from("configuracion_pagos")
      .upsert(
        {
          id_empresa: data.id_empresa,
          id_proyecto: data.id_proyecto,
          razon_social: data.razon_social ?? null,
          direccion_matriz: data.direccion_matriz ?? null,
          direccion_establecimiento: data.direccion_establecimiento ?? null,
          codigo_establecimiento: data.codigo_establecimiento || "001",
          punto_emision: data.punto_emision || "001",
        },
        { onConflict: "id_empresa,id_proyecto" },
      )
      .select()
      .single();
    if (error) throw error;
    return saved as ConfiguracionPagos;
  }
}
