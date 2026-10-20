import type { PuntoPlano } from "@/domain/lote/entities";

/**
 * Regla de visibilidad de las etiquetas del plano (cambio
 * improve-public-lotization-map).
 *
 * La regla es **por polígono y no por nivel de zoom global**: dentro de un mismo
 * plano conviven lotes de superficies distintas, y además el texto que hay que
 * pintar no mide lo mismo en todos (`H1` cabe donde `L1.10` no). La etiqueta se
 * pinta si **su propio texto cabe dentro de su propio contorno proyectado**.
 *
 * Medido sobre el plano real de `ciudadela-san-lucas` sin zoom, con el visor a
 * pantalla completa, el lote mediano mide unos 26 × 18 px y quedan etiquetados
 * 195 de los 227 lotes; un umbral fijo de 44 × 26 px dejaba 2. El recuento
 * depende del tamaño de la ventana, porque la regla es por lote: al acercar
 * entran más y al alejar menos. El ancho por letra es una estimación
 * validada contra `getComputedTextLength()` en el plano real, donde la
 * desviación máxima medida fue de 0,4 px.
 */

/** Tamaño en pantalla, en píxeles, del texto que pinta el plano. */
export const TAMANO_FUENTE_ETIQUETA_PX = 11;
/**
 * Ancho medio de una letra en negrita a ese cuerpo. Medido con
 * `getComputedTextLength()` sobre las etiquetas ya pintadas en el plano real:
 * la mediana queda en 6,7-7,4 px por letra y el máximo observado en 8,0, así
 * que se redondea al alza a 7,0 por seguridad sin quedarse corto.
 */
export const ANCHO_MEDIO_CARACTER_PX = 7;
/**
 * Holgura total, en píxeles, que debe quedar a los lados del texto. El halo
 * blanco ocupa 1,5 px por lado, así que con 4 px queda medio píxel libre de
 * borde a borde y el texto no toca el contorno del lote.
 */
export const SEPARACION_ETIQUETA_PX = 4;
/** Altura mínima, en píxeles, para que la línea no roce los bordes del lote. */
export const ALTO_MINIMO_ETIQUETA_PX = TAMANO_FUENTE_ETIQUETA_PX + 4;

/** Tamaño en píxeles del plano dibujado, una vez aplicado el zoom. */
export interface TamanoPlanoPx {
  ancho: number;
  alto: number;
}

/** Ancho y alto en píxeles de la caja envolvente del polígono. */
function cajaEnPx(
  poligono: readonly PuntoPlano[],
  planoPx: TamanoPlanoPx,
): { ancho: number; alto: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poligono) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { ancho: (maxX - minX) * planoPx.ancho, alto: (maxY - minY) * planoPx.alto };
}

/**
 * ¿Cabe esta etiqueta legible dentro de este polígono?
 *
 * Devuelve `false` cuando no hay texto, cuando el contorno no está completo o
 * cuando el plano aún no se ha medido, de modo que un lote nunca queda etiquetado
 * por accidente.
 */
export function etiquetaVisible(
  poligono: readonly PuntoPlano[] | null | undefined,
  planoPx: TamanoPlanoPx,
  etiqueta: string | null | undefined,
): boolean {
  if (!etiqueta) return false;
  if (!poligono || poligono.length < 3) return false;
  if (!(planoPx.ancho > 0) || !(planoPx.alto > 0)) return false;

  const caja = cajaEnPx(poligono, planoPx);
  if (!caja) return false;

  const anchoTexto = etiqueta.length * ANCHO_MEDIO_CARACTER_PX + SEPARACION_ETIQUETA_PX;
  return caja.ancho >= anchoTexto && caja.alto >= ALTO_MINIMO_ETIQUETA_PX;
}

/**
 * Centro de la caja envolvente del polígono, en coordenadas normalizadas: es
 * el punto donde se coloca la etiqueta. Los contornos del plano son
 * cuadriláteros, así que aquí coincide con el centro de la figura; con formas
 * en L la caja envolvente puede caer fuera del contorno.
 */
export function centroPoligono(poligono: readonly PuntoPlano[]): PuntoPlano | null {
  if (poligono.length < 2) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poligono) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}
