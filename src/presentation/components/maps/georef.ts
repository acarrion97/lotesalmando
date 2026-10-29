import type { UbicacionPlano } from "@/domain/mapa/entities";

/**
 * Matemática de georreferenciación del plano: convierte la ubicación GPS
 * + ancho en metros del plano en la ventana geográfica que cubre la imagen
 * y, a partir de ahí, en la rejilla de tiles satelitales (Web Mercator)
 * que la llenan. Sin dependencias: todo a mano con la proyección estándar.
 */

export interface LimitesGeo {
  norte: number;
  sur: number;
  este: number;
  oeste: number;
}

const METROS_POR_GRADO_LAT = 111320;
const TAMANO_TILE = 256;
/** El sistema de tiles se corta en los polos. */
const LIMITE_MERCATOR = 85.05112878;

/**
 * Ventana geográfica que ocupa la imagen del plano.
 * `aspecto` es ancho/alto de la imagen en píxeles: el ancho real ya se
 * conoce, la altura se deduce de la proporción.
 */
export function limitesDelPlano(ubicacion: UbicacionPlano, aspecto: number): LimitesGeo {
  const proporcion = aspecto > 0 && Number.isFinite(aspecto) ? aspecto : 1;
  const altoMetros = ubicacion.ancho_m / proporcion;

  const deltaLat = altoMetros / METROS_POR_GRADO_LAT;
  const metrosPorGradoLng =
    METROS_POR_GRADO_LAT * Math.cos((ubicacion.centro_lat * Math.PI) / 180) || METROS_POR_GRADO_LAT;
  const deltaLng = ubicacion.ancho_m / metrosPorGradoLng;

  return {
    norte: ubicacion.centro_lat + deltaLat / 2,
    sur: ubicacion.centro_lat - deltaLat / 2,
    este: ubicacion.centro_lng + deltaLng / 2,
    oeste: ubicacion.centro_lng - deltaLng / 2,
  };
}

/** Posición en píxeles (Web Mercator) de una coordenada a un nivel de zoom. */
export function pxMundo(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const mundo = TAMANO_TILE * 2 ** zoom;
  const latCortada = Math.max(-LIMITE_MERCATOR, Math.min(LIMITE_MERCATOR, lat));
  const x = ((lon + 180) / 360) * mundo;
  const sin = Math.sin((latCortada * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * mundo;
  return { x, y };
}

export interface RejillaTiles {
  zoom: number;
  /** Tamaño del bloque de tiles en píxeles (antes de escalarlo a la caja). */
  anchoPx: number;
  altoPx: number;
  tiles: { x: number; y: number; left: number; top: number }[];
}

export interface RecorteTileAncestro {
  zoom: number;
  x: number;
  y: number;
  /** Factor por el que se amplía el tile ancestro para llenar un tile hijo. */
  escala: number;
  /** Desplazamiento en píxeles dentro del tile ancestro. */
  desplazamientoX: number;
  desplazamientoY: number;
}

/**
 * Coordenadas del tile ancestro que cubre un tile pedido a mayor zoom y
 * desplazamiento del recorte del ancestro que corresponde al hijo.
 */
export function recorteTileAncestro(
  zoomPedido: number,
  xPedido: number,
  yPedido: number,
  zoomAncestro: number,
): RecorteTileAncestro {
  if (
    !Number.isInteger(zoomPedido) ||
    !Number.isInteger(zoomAncestro) ||
    zoomAncestro < 0 ||
    zoomAncestro > zoomPedido ||
    !Number.isInteger(xPedido) ||
    !Number.isInteger(yPedido) ||
    xPedido < 0 ||
    yPedido < 0 ||
    xPedido >= 2 ** zoomPedido ||
    yPedido >= 2 ** zoomPedido
  ) {
    throw new RangeError("Coordenadas de tile o nivel de zoom inválidos.");
  }

  const escala = 2 ** (zoomPedido - zoomAncestro);
  const x = Math.floor(xPedido / escala);
  const y = Math.floor(yPedido / escala);
  return {
    zoom: zoomAncestro,
    x,
    y,
    escala,
    desplazamientoX: (xPedido - x * escala) * TAMANO_TILE,
    desplazamientoY: (yPedido - y * escala) * TAMANO_TILE,
  };
}

/**
 * Tiles que cubren los límites dados, a un zoom que deja la imagen con
 * ~3x la resolución de la caja destino (para que no se vea borrosa al
 * escalar). Se devuelve en píxeles "mundo" para que el caller escale.
 */
export function rejillaTiles(limites: LimitesGeo, anchoCaja: number): RejillaTiles {
  const anchoGrados = Math.max(1e-9, limites.este - limites.oeste);
  const deseado = Math.max(TAMANO_TILE, anchoCaja * 3);
  const zoomIdeal = Math.log2((deseado * 360) / (anchoGrados * TAMANO_TILE));
  const zoom = Math.max(0, Math.min(20, Math.ceil(zoomIdeal)));

  const origen = pxMundo(limites.oeste, limites.norte, zoom);
  const fin = pxMundo(limites.este, limites.sur, zoom);
  const anchoPx = Math.max(1, fin.x - origen.x);
  const altoPx = Math.max(1, fin.y - origen.y);

  const x0 = Math.floor(origen.x / TAMANO_TILE);
  const x1 = Math.floor((fin.x - 0.01) / TAMANO_TILE);
  const y0 = Math.floor(origen.y / TAMANO_TILE);
  const y1 = Math.floor((fin.y - 0.01) / TAMANO_TILE);
  const maxTile = 2 ** zoom - 1;

  const tiles: RejillaTiles["tiles"] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (x < 0 || y < 0 || x > maxTile || y > maxTile) continue;
      tiles.push({ x, y, left: x * TAMANO_TILE - origen.x, top: y * TAMANO_TILE - origen.y });
    }
  }

  return { zoom, anchoPx, altoPx, tiles };
}

/**
 * Plantilla del tile satelital, en el orden `{z}/{y}/{x}` que usa Esri. Es la
 * misma fuente para `CapaSatelite` (modo Satelte y capa aerea del Visor 3D) y
 * para la capa de imagenes de la vista 3D real, asi las tres miran exactamente
 * la misma fotografia del territorio sin necesitar API key.
 */
export const PLANTILLA_TILE_ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** URL del tile satelital (Esri World Imagery, sin API key). */
export function urlTile(zoom: number, x: number, y: number): string {
  return PLANTILLA_TILE_ESRI.replace("{z}", String(zoom))
    .replace("{y}", String(y))
    .replace("{x}", String(x));
}
