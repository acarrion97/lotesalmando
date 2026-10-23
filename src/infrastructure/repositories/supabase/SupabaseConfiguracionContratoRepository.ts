import { supabase } from "@/infrastructure/supabase/client";
import type { ConfiguracionContrato } from "@/domain/configuracion/entities";
import type {
  ConfiguracionContratoRepository,
  SaveConfiguracionContratoInput,
} from "@/domain/configuracion/repositories";

export class SupabaseConfiguracionContratoRepository implements ConfiguracionContratoRepository {
  async getByProyectoId(idProyecto: number): Promise<ConfiguracionContrato | null> {
    const { data, error } = await supabase
      .from("configuracion_contrato")
      .select("*")
      .eq("id_proyecto", idProyecto)
      .maybeSingle();
    if (error) throw error;
    return (data as ConfiguracionContrato | null) ?? null;
  }

  async save(data: SaveConfiguracionContratoInput): Promise<ConfiguracionContrato> {
    // `configuracion_contrato` tiene UNIQUE (id_empresa, id_proyecto):
    // una sola fila por proyecto.
    const { data: saved, error } = await supabase
      .from("configuracion_contrato")
      .upsert(
        {
          id_empresa: data.id_empresa,
          id_proyecto: data.id_proyecto,
          ruc: data.ruc ?? null,
          representante: data.representante ?? null,
          representante_cedula: data.representante_cedula ?? null,
          representante_email: data.representante_email ?? null,
          ciudad: data.ciudad ?? null,
          cuentas_bancarias: data.cuentas_bancarias ?? null,
          direccion_canje: data.direccion_canje ?? null,
        },
        { onConflict: "id_empresa,id_proyecto" },
      )
      .select()
      .single();
    if (error) throw error;
    return saved as ConfiguracionContrato;
  }
}
