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
    const { data: saved, error } = await supabase
      .from("configuracion")
      .upsert(
        {
          id_empresa: data.id_empresa,
          moneda: data.moneda,
          idioma: data.idioma,
          representante: data.representante ?? null,
          representante_cedula: data.representante_cedula ?? null,
          representante_email: data.representante_email ?? null,
          ciudad: data.ciudad ?? null,
          cuentas_bancarias: data.cuentas_bancarias ?? null,
          direccion_canje: data.direccion_canje ?? null,
        },
        { onConflict: "id_empresa" },
      )
      .select()
      .single();
    if (error) throw error;
    return saved as Configuracion;
  }
}
