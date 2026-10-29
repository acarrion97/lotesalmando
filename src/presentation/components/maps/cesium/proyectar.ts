import type { PuntoPlano } from "@/domain/lote/entities";
import type { LimitesGeo } from "../georef";

/**
 * Proyección de un contorno de lote a coordenadas geográficas, para dibujarlo
 * sobre el terreno real en la vista 3D.
 *
 * `lote.poligono` vive en espacio normalizado de imagen: `[x, y]` con `x` de
 * izquierda a derecha e `y` de arriba abajo, ambos en `[0..1]`. Este módulo
 * aplica el mapeo lineal inverso al que `CapaSatelite` ya usa para posicionar
 * sus tiles sobre la ventana geográfica, de modo que el polígono cae encima
 * de la imagen satelital y de la malla fotogramétrica.
 *
 * La imagen se supone alineada al norte, la misma hipótesis que ya hacen
 * `limitesDelPlano()` y `CapaSatelite`. Si el plano del cliente está girado,
 * los polígonos quedan rotados igual que hoy en modo satélite: no es una
 * regresión de este módulo.
 *
 * Se mapea en grados lineales y no en píxeles Mercator a propósito: el residuo
 * entre ambas lecturas en un plano de 200 m es del orden de centímetros, y a
 * cambio la proyección es pura, no depende de un nivel de zoom arbitrario ni
 * arrastra la matemática de `georef.ts`.
 */

/**
 * Par `[longitud, latitud]` en WGS84. En ese orden porque es el que consumen
 * `Cartesian3.fromDegrees` de Cesium y las clases `LonLat` de la mayoría de
 * librerías geográficas.
 */
export type CoordenadaWgs84 = [lng: number, lat: number];

/** Longitud de una coordenada normalizada de imagen, en el eje este-oeste. */
export function lngDeX(x: number, limites: LimitesGeo): number {
  return limites.oeste + x * (limites.este - limites.oeste);
}

/** Latitud de una coordenada normalizada de imagen. `y = 0` es el norte. */
export function latDeY(y: number, limites: LimitesGeo): number {
  return limites.norte - y * (limites.norte - limites.sur);
}

/** Un punto del plano a coordenadas WGS84. */
export function puntoAWgs84([x, y]: PuntoPlano, limites: LimitesGeo): CoordenadaWgs84 {
  return [lngDeX(x, limites), latDeY(y, limites)];
}

/**
 * Contorno completo a coordenadas WGS84, en el mismo orden de vértices que
 * entró. Es total: devuelve un punto por cada punto recibido, aunque esté
 * fuera de `[0..1]`, para que la geometría no se deforme en silencio.
 */
export function poligonoAWgs84(
  poligono: readonly PuntoPlano[],
  limites: LimitesGeo,
): CoordenadaWgs84[] {
  return poligono.map((punto) => puntoAWgs84(punto, limites));
}
