import { supabase } from "@/infrastructure/supabase/client";
import type { LoteEstado, PuntoPlano } from "@/domain/lote/entities";
import type { Mapa, MapaPublico, PlanoLote, UbicacionPlano } from "@/domain/mapa/entities";
import type { MapaRepository, SaveMapaInput } from "@/domain/mapa/repositories";

interface LotePlanoRow {
  id_lote: number;
  id_manzana: number;
  numero_lote: string;
  estado: LoteEstado;
  precio_lista: number | null;
  superficie_m2: number | null;
  medidas: string | null;
  poligono: PuntoPlano[] | null;
  manzana_bloque: { nombre_codigo: string | null } | null;
}

export class SupabaseMapaRepository implements MapaRepository {
  async getByProyectoId(proyectoId: number): Promise<Mapa | null> {
    // .limit(1) en vez de .maybeSingle(): si hubiera filas duplicadas
    // históricas, al menos se lee una en vez de fallar.
    const { data, error } = await supabase
      .from("mapas")
      .select("*")
      .eq("id_proyecto", proyectoId)
      .limit(1);
    if (error) throw error;
    return (data?.[0] as Mapa | undefined) ?? null;
  }

  async save(data: SaveMapaInput): Promise<Mapa> {
    const existente = await this.getByProyectoId(data.id_proyecto);

    if (existente) {
      const { data: updated, error } = await supabase
        .from("mapas")
        .update({ url_publica: data.url_publica })
        .eq("id_mapa", existente.id_mapa)
        .select()
        .single();
      if (error) throw error;
      return updated as Mapa;
    }

    const { data: created, error } = await supabase.from("mapas").insert(data).select().single();
    if (error) throw error;
    return created as Mapa;
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from("mapas").delete().eq("id_mapa", id);
    if (error) throw error;
  }

  async getLotesPlano(proyectoId: number): Promise<PlanoLote[]> {
    // !inner + filtro anidado: solo los lotes cuyas manzanas cuelgan de
    // etapas del proyecto, en una sola consulta.
    const { data, error } = await supabase
      .from("lotes")
      .select(
        "id_lote, id_manzana, numero_lote, estado, precio_lista, superficie_m2, medidas, poligono, manzana_bloque!inner(nombre_codigo, etapas!inner(id_proyecto))",
      )
      .eq("manzana_bloque.etapas.id_proyecto", proyectoId);
    if (error) throw error;

    return ((data ?? []) as unknown as LotePlanoRow[]).map((row) => ({
      id_lote: row.id_lote,
      id_manzana: row.id_manzana,
      numero_lote: row.numero_lote,
      estado: row.estado,
      precio_lista: row.precio_lista ?? undefined,
      superficie_m2: row.superficie_m2,
      medidas: row.medidas,
      poligono: row.poligono,
      manzana: row.manzana_bloque?.nombre_codigo ?? `${row.id_manzana}`,
    }));
  }

  async guardarPoligono(loteId: number, poligono: PuntoPlano[] | null): Promise<void> {
    const { error } = await supabase.from("lotes").update({ poligono }).eq("id_lote", loteId);
    if (error) throw error;
  }

  async setSlug(mapaId: number, slug: string | null): Promise<Mapa> {
    const { data, error } = await supabase
      .from("mapas")
      .update({ slug })
      .eq("id_mapa", mapaId)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Ese enlace ya lo usa otro proyecto");
      throw error;
    }
    return data as Mapa;
  }

  async setUbicacion(mapaId: number, ubicacion: UbicacionPlano | null): Promise<Mapa> {
    const { data, error } = await supabase
      .from("mapas")
      .update({
        centro_lat: ubicacion?.centro_lat ?? null,
        centro_lng: ubicacion?.centro_lng ?? null,
        ancho_m: ubicacion?.ancho_m ?? null,
      })
      .eq("id_mapa", mapaId)
      .select()
      .single();
    if (error) throw error;
    return data as Mapa;
  }

  async getPublicoBySlug(slug: string): Promise<MapaPublico | null> {
    const { data, error } = await supabase.rpc("mapa_publico", { p_slug: slug });
    if (error) throw error;
    if (!data) return null;

    // El RPC devuelve JSON: se normaliza para que la página pública no se
    // rompa si un campo opcional viene ausente (p. ej. migración 011 sin
    // aplicar todavía).
    const crudo = data as Partial<MapaPublico> & Record<string, unknown>;
    return {
      proyecto: crudo.proyecto ?? "",
      url_publica: crudo.url_publica ?? null,
      moneda: crudo.moneda ?? "USD",
      medios: Array.isArray(crudo.medios) ? crudo.medios : [],
      estadisticas: crudo.estadisticas ?? undefined,
      centro_lat: crudo.centro_lat ?? null,
      centro_lng: crudo.centro_lng ?? null,
      ancho_m: crudo.ancho_m ?? null,
      lotes: Array.isArray(crudo.lotes) ? crudo.lotes : [],
    };
  }
}
