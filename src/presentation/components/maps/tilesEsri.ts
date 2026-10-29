import type { LimitesGeo } from "./georef";
import { pxMundo } from "./georef.ts";

const TILEMAP_ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tilemap";
const TAMANO_TILE = 256;
const MAX_TILES_POR_BLOQUE = 4096;
const MAX_CACHE_TILEMAP = 512;
const TIMEOUT_TILEMAP_MS = 8000;

interface TileMapResponse {
  data?: unknown;
  location?: {
    height?: unknown;
    left?: unknown;
    top?: unknown;
    width?: unknown;
  };
  valid?: unknown;
}

interface RangoTile {
  zoom: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

const cacheBloques = new Map<string, Promise<readonly boolean[]>>();

function claveBloque({ zoom, x, y, ancho, alto }: RangoTile): string {
  return `${zoom}/${y}/${x}/${ancho}/${alto}`;
}

function urlBloque({ zoom, x, y, ancho, alto }: RangoTile): string {
  return `${TILEMAP_ESRI}/${zoom}/${y}/${x}/${ancho}/${alto}?f=pjson`;
}

async function consultarBloque(rango: RangoTile): Promise<readonly boolean[]> {
  const clave = claveBloque(rango);
  const existente = cacheBloques.get(clave);
  if (existente) return existente;

  const consulta = (async () => {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TIMEOUT_TILEMAP_MS);
    try {
      const respuesta = await fetch(urlBloque(rango), { signal: controlador.signal });
      if (!respuesta.ok) {
        throw new Error(`Esri tilemap respondió HTTP ${respuesta.status}.`);
      }

      const resultado = (await respuesta.json()) as TileMapResponse;
      if (resultado.valid === false) {
        return Array.from({ length: rango.ancho * rango.alto }, () => false);
      }
      if (resultado.valid !== true || !Array.isArray(resultado.data)) {
        throw new Error("Esri tilemap respondió con una estructura inválida.");
      }

      const { ancho, alto } = rango;
      if (resultado.data.length !== ancho * alto) {
        throw new Error("Esri tilemap devolvió una cantidad inesperada de tiles.");
      }
      if (resultado.data.some((disponible) => disponible !== 0 && disponible !== 1)) {
        throw new Error("Esri tilemap devolvió un indicador de disponibilidad inválido.");
      }
      return resultado.data.map((disponible) => disponible === 1);
    } finally {
      clearTimeout(timeout);
    }
  })();

  cacheBloques.set(clave, consulta);
  if (cacheBloques.size > MAX_CACHE_TILEMAP) {
    const primeraClave = cacheBloques.keys().next().value;
    if (primeraClave !== undefined) cacheBloques.delete(primeraClave);
  }

  try {
    return await consulta;
  } catch (error) {
    cacheBloques.delete(clave);
    throw error;
  }
}

function tilesDeVentana(limites: LimitesGeo, zoom: number): RangoTile {
  const origen = pxMundo(limites.oeste, limites.norte, zoom);
  const fin = pxMundo(limites.este, limites.sur, zoom);
  const maxTile = 2 ** zoom - 1;
  const x = Math.max(0, Math.min(maxTile, Math.floor(origen.x / TAMANO_TILE)));
  const y = Math.max(0, Math.min(maxTile, Math.floor(origen.y / TAMANO_TILE)));
  const finX = Math.max(0, Math.min(maxTile, Math.floor((fin.x - 0.01) / TAMANO_TILE)));
  const finY = Math.max(0, Math.min(maxTile, Math.floor((fin.y - 0.01) / TAMANO_TILE)));
  return {
    zoom,
    x,
    y,
    ancho: Math.max(1, finX - x + 1),
    alto: Math.max(1, finY - y + 1),
  };
}

async function todosLosTilesDisponibles(rango: RangoTile): Promise<boolean> {
  for (let fila = 0; fila < rango.alto; fila++) {
    for (let columna = 0; columna < rango.ancho; columna += MAX_TILES_POR_BLOQUE) {
      const ancho = Math.min(MAX_TILES_POR_BLOQUE, rango.ancho - columna);
      const disponibles = await consultarBloque({
        zoom: rango.zoom,
        x: rango.x + columna,
        y: rango.y + fila,
        ancho,
        alto: 1,
      });
      if (disponibles.some((disponible) => !disponible)) return false;
    }
  }
  return true;
}

/**
 * Obtiene en una sola petición por fila la disponibilidad de los tiles de
 * una rejilla, evitando mostrar respuestas 200 con el aviso de falta de datos.
 */
export async function disponibilidadTilesEsri(
  zoom: number,
  tiles: readonly { x: number; y: number }[],
): Promise<ReadonlyMap<string, boolean>> {
  const filas = new Map<number, number[]>();
  for (const tile of tiles) {
    const columnas = filas.get(tile.y) ?? [];
    columnas.push(tile.x);
    filas.set(tile.y, columnas);
  }

  const disponibles = new Map<string, boolean>();
  for (const [y, columnas] of filas) {
    const unicas = [...new Set(columnas)].sort((a, b) => a - b);
    const xMin = unicas[0];
    const xMax = unicas[unicas.length - 1];
    const bloque = await consultarBloque({
      zoom,
      x: xMin,
      y,
      ancho: xMax - xMin + 1,
      alto: 1,
    });
    for (const x of unicas) {
      disponibles.set(`${x}/${y}`, bloque[x - xMin] ?? false);
    }
  }
  return disponibles;
}

/** Comprueba si un tile individual tiene datos satelitales publicados. */
export async function tileEsriDisponible(zoom: number, x: number, y: number): Promise<boolean> {
  const disponibles = await consultarBloque({ zoom, x, y, ancho: 1, alto: 1 });
  return disponibles[0] ?? false;
}

/**
 * Devuelve el mayor nivel que cubre por completo la ventana del proyecto.
 * `null` significa que Esri no tiene ningún nivel con cobertura total.
 */
export async function nivelMaximoEsriConCobertura(
  limites: LimitesGeo,
  zoomMaximo: number,
): Promise<number | null> {
  for (let zoom = zoomMaximo; zoom >= 0; zoom--) {
    if (await todosLosTilesDisponibles(tilesDeVentana(limites, zoom))) return zoom;
  }
  return null;
}
