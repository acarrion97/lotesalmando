import { supabase } from "@/infrastructure/supabase/client";
import type { Configuracion } from "@/domain/configuracion/entities";
import type {
  ConfiguracionRepository,
  SaveConfiguracionInput,
} from "@/domain/configuracion/repositories";

export class SupabaseConfiguracionRepository implements ConfiguracionRepository {
  async getByEmpresaId(empresaId: number): Promise<Configuracion | null> {
    const { data, error } = await supabase
      .from("configuracion")
      .select("*")
      .eq("id_empresa", empresaId)
      .maybeSingle();
    if (error) throw error;
    return (data as Configuracion | null) ?? null;
  }

  async save(data: SaveConfiguracionInput): Promise<Configuracion> {
    // `configuracion` tiene UNIQUE (id_empresa): un solo registro por empresa.
    // El upsert sólo recibe preferencias editables: no toca las columnas
    // legales heredadas (ya se editan por proyecto).
    const { data: saved, error } = await supabase
      .from("configuracion")
      .upsert(
        {
          id_empresa: data.id_empresa,
          moneda: data.moneda,
          idioma: data.idioma,
          dias_aviso_cuota: data.dias_aviso_cuota,
        },
        { onConflict: "id_empresa" },
      )
      .select()
      .single();
    if (error) throw error;
    return saved as Configuracion;
  }

  async setLogo(empresaId: number, logoUrl: string | null): Promise<Configuracion> {
    const { data, error } = await supabase
      .from("configuracion")
      .upsert(
        { id_empresa: empresaId, logo_url: logoUrl },
        { onConflict: "id_empresa" },
      )
      .select()
      .single();
    if (error) throw error;
    return data as Configuracion;
  }
}
