import type { PuntoPlano } from "@/domain/lote/entities";
import type { Mapa, MapaPublico, PlanoLote, UbicacionPlano } from "../entities";

export interface SaveMapaInput {
  id_proyecto: number;
  url_publica: string;
}

export interface MapaRepository {
  /** Plano del proyecto, o `null` si aún no tiene imagen. Un plano por proyecto. */
  getByProyectoId(proyectoId: number): Promise<Mapa | null>;
  /** Crea el plano del proyecto si no existe; lo reemplaza si ya existe. */
  save(data: SaveMapaInput): Promise<Mapa>;
  remove(id: number): Promise<void>;
  /** Todos los lotes del proyecto (con o sin polígono) para dibujarlos sobre el plano. */
  getLotesPlano(proyectoId: number): Promise<PlanoLote[]>;
  /** Guarda (o borra, con `null`) el contorno de un lote sobre el plano. */
  guardarPoligono(loteId: number, poligono: PuntoPlano[] | null): Promise<void>;
  /** Publica el plano en `/mapa/:slug`, o lo despublica con `null`. */
  setSlug(mapaId: number, slug: string | null): Promise<Mapa>;
  /** Guarda (o borra, con `null`) la ubicación GPS y escala real del plano. */
  setUbicacion(mapaId: number, ubicacion: UbicacionPlano | null): Promise<Mapa>;
  /** Mapa público por slug (accesible sin sesión); `null` si no existe. */
  getPublicoBySlug(slug: string): Promise<MapaPublico | null>;
}
