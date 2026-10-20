import { supabase } from "@/infrastructure/supabase/client";
import type {
  RegistrarInteresPublicoCommand,
  RegistrarInteresPublicoPort,
  RegistroInteresResult,
} from "@/application/prospectos/ports/RegistrarInteresPublicoPort";

/**
 * Invoca la RPC `mapa_publico_registrar_interes(p_slug, p_id_lote, ...)`
 * de la migración `018_mapa_publico_registrar_interes.sql`: la deduplicación
 * del prospecto y la oportunidad del lote ocurren en la base, en una sola
 * transacción y sin sesión (rol `anon`), igual que el resto del mapa público.
 */
export class SupabaseRegistrarInteresPublico implements RegistrarInteresPublicoPort {
  async execute(command: RegistrarInteresPublicoCommand): Promise<RegistroInteresResult> {
    const { data, error } = await supabase.rpc("mapa_publico_registrar_interes", {
      p_slug: command.slug,
      p_id_lote: command.id_lote,
      p_nombres: command.nombres,
      p_email: command.email,
      p_telefono: command.telefono,
    });

    if (error) throw new Error(error.message ?? "No se pudo registrar su interés");

    const fila = Array.isArray(data) ? data[0] : data;
    if (!fila) throw new Error("El registro no devolvió resultado");

    return {
      id_prospecto: Number(fila.id_prospecto),
      id_oportunidad: Number(fila.id_oportunidad),
      reutilizado: Boolean(fila.reutilizado),
    };
  }
}
