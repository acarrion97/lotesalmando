import { supabase } from "@/infrastructure/supabase/client";
import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository, CrearEmpresaConAdminInput } from "@/domain/empresa/repositories";

export class SupabaseEmpresaRepository implements EmpresaRepository {
  async getAll(): Promise<Empresa[]> {
    const { data, error } = await supabase.from("empresa").select("*");
    if (error) throw error;
    return (data ?? []) as Empresa[];
  }

  async getById(id: number): Promise<Empresa | null> {
    const { data, error } = await supabase.from("empresa").select("*").eq("id_empresa", id).single();
    if (error) return null;
    return data as Empresa;
  }

  async create(data: Omit<Empresa, "id_empresa">): Promise<Empresa> {
    const { data: created, error } = await supabase.from("empresa").insert(data).select().single();
    if (error) throw error;
    return created as Empresa;
  }

  /**
   * Crea la empresa + su admin en una sola transacción vía la RPC
   * `crear_empresa_con_admin` (migración 026). La RPC devuelve el
   * id_empresa; de ahí en más solo necesitamos re-leer la fila para devolver
   * la Empresa completa.
   */
  async createConAdmin(input: CrearEmpresaConAdminInput): Promise<Empresa> {
    const { data, error } = await supabase.rpc("crear_empresa_con_admin", {
      p_razon_social: input.razon_social,
      p_ruc: input.ruc ?? "",
      p_admin_nombres: input.admin_nombres,
      p_admin_email: input.admin_email,
      p_admin_password: input.admin_password,
    });

    if (error) throw new Error(this.traducirErrorRpc(error.message));

    const idEmpresa = data as unknown as number;
    const creada = await this.getById(idEmpresa);
    if (!creada) throw new Error("La empresa se creó pero no se pudo leer de vuelta.");
    return creada;
  }

  /** Mensajes de error más legibles para los fallos comunes de la RPC. */
  private traducirErrorRpc(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("permiso crear_empresas")) {
      return "No tienes el permiso `crear_empresas` para crear empresas.";
    }
    if (m.includes("ya existe una cuenta de acceso")) {
      return "Ya existe una cuenta de acceso con ese correo.";
    }
    if (m.includes("contrasena")) {
      return "La contraseña del admin debe tener al menos 6 caracteres.";
    }
    return message;
  }

  async update(id: number, data: Partial<Empresa>): Promise<Empresa> {
    const { data: updated, error } = await supabase.from("empresa").update(data).eq("id_empresa", id).select().single();
    if (error) throw error;
    return updated as Empresa;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("empresa").delete().eq("id_empresa", id);
    if (error) throw error;
  }
}
