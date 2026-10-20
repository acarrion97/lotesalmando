import type { PuntoPlano } from "@/domain/lote/entities";
import type { Mapa, MapaPublico, PlanoLote, UbicacionPlano } from "@/domain/mapa/entities";
import type { MapaRepository, SaveMapaInput } from "@/domain/mapa/repositories";
import { lotes } from "@/mocks/lotes.mock";
import { manzanas } from "@/mocks/manzanas.mock";
import { etapas } from "@/mocks/etapas.mock";
import { proyectos } from "@/mocks/proyectos.mock";

/** Un plano por proyecto, en memoria (solo sirve para `VITE_DATA_PROVIDER=mock`). */
const registros = new Map<number, Mapa>();
const poligonos = new Map<number, PuntoPlano[]>();
let siguienteId = 1;

export class MockMapaRepository implements MapaRepository {
  async getByProyectoId(proyectoId: number): Promise<Mapa | null> {
    return registros.get(proyectoId) ?? null;
  }

  async save(data: SaveMapaInput): Promise<Mapa> {
    const existente = registros.get(data.id_proyecto);
    const guardado: Mapa = {
      id_mapa: existente?.id_mapa ?? siguienteId++,
      id_proyecto: data.id_proyecto,
      url_publica: data.url_publica,
      slug: existente?.slug ?? null,
      centro_lat: existente?.centro_lat ?? null,
      centro_lng: existente?.centro_lng ?? null,
      ancho_m: existente?.ancho_m ?? null,
    };
    registros.set(data.id_proyecto, guardado);
    return guardado;
  }

  async remove(id: number): Promise<void> {
    for (const [proyectoId, mapa] of registros) {
      if (mapa.id_mapa === id) registros.delete(proyectoId);
    }
  }

  async getLotesPlano(proyectoId: number): Promise<PlanoLote[]> {
    const etapaIds = new Set(etapas.filter((e) => e.id_proyecto === proyectoId).map((e) => e.id_etapa));
    const manzanasDelProyecto = manzanas.filter((m) => etapaIds.has(m.id_etapa));
    return lotes
      .filter((l) => manzanasDelProyecto.some((m) => m.id_manzana === l.id_manzana))
      .map((l) => ({
        id_lote: l.id_lote,
        id_manzana: l.id_manzana,
        numero_lote: l.numero_lote,
        estado: l.estado,
        precio_lista: l.precio_lista,
        manzana:
          manzanasDelProyecto.find((m) => m.id_manzana === l.id_manzana)?.nombre_codigo ??
          `${l.id_manzana}`,
        poligono: poligonos.get(l.id_lote) ?? null,
      }));
  }

  async guardarPoligono(loteId: number, poligono: PuntoPlano[] | null): Promise<void> {
    if (poligono) poligonos.set(loteId, poligono);
    else poligonos.delete(loteId);
  }

  async setSlug(mapaId: number, slug: string | null): Promise<Mapa> {
    for (const [proyectoId, mapa] of registros) {
      if (slug && mapa.id_mapa !== mapaId && mapa.slug === slug) {
        throw new Error("Ese enlace ya lo usa otro proyecto");
      }
      if (mapa.id_mapa === mapaId) {
        const actualizado = { ...mapa, slug };
        registros.set(proyectoId, actualizado);
        return actualizado;
      }
    }
    throw new Error("El proyecto no tiene plano");
  }

  async setUbicacion(mapaId: number, ubicacion: UbicacionPlano | null): Promise<Mapa> {
    for (const [proyectoId, mapa] of registros) {
      if (mapa.id_mapa === mapaId) {
        const actualizado: Mapa = {
          ...mapa,
          centro_lat: ubicacion?.centro_lat ?? null,
          centro_lng: ubicacion?.centro_lng ?? null,
          ancho_m: ubicacion?.ancho_m ?? null,
        };
        registros.set(proyectoId, actualizado);
        return actualizado;
      }
    }
    throw new Error("El proyecto no tiene plano");
  }

  async getPublicoBySlug(slug: string): Promise<MapaPublico | null> {
    const mapa = [...registros.values()].find((m) => m.slug === slug);
    if (!mapa) return null;
    const lotesPlano = await this.getLotesPlano(mapa.id_proyecto);
    return {
      proyecto: proyectos.find((p) => p.id_proyecto === mapa.id_proyecto)?.nombre ?? "Proyecto",
      url_publica: mapa.url_publica,
      centro_lat: mapa.centro_lat ?? null,
      centro_lng: mapa.centro_lng ?? null,
      ancho_m: mapa.ancho_m ?? null,
      lotes: lotesPlano
        .filter((l) => l.poligono)
        .map(({ precio_lista: _precio, ...lote }) => lote),
    };
  }
}
