/**
 * Identificador público de un lote sobre el plano: su número de lote, tal como
 * lo trae la fuente de datos (`H1`, `H10`, `L1.10`).
 *
 * Ya identifica la manzana por su prefijo y es único dentro del proyecto, así
 * que no hace falta componerlo con el nombre de la manzana: en los planos
 * reales ese nombre es una palabra larga (p. ej. `LADRILLERA H`) y la etiqueta
 * `LADRILLERA H-H1` no cabe sobre un polígono. La RPC `mapa_publico` tampoco
 * devuelve `codigo_catastral`, que sería el otro candidato.
 */

/** Lo mínimo que hace falta para nombrar a un lote. */
export interface LoteIdentificable {
  numero_lote: string | null | undefined;
}

/**
 * Devuelve el número de lote, o `null` cuando falta. No se inventa ningún
 * identificador, ni tampoco uno derivado de la posición en la lista, que se
 * reordena al filtrar.
 */
export function identificadorPublicoLote(lote: LoteIdentificable): string | null {
  const numero = (lote.numero_lote ?? "").trim();
  return numero || null;
}
