/**
 * Detecta en el texto libre de las notas de un prospecto el numero de un lote.
 *
 * Pensado para el alta rapida: quien registra el prospecto anota algo como
 * "lote 5", "lote H3", "lote: L1.7" o directamente "H3", y al abrir el modal
 * de reserva ese lote ya viene pre-seleccionado.
 *
 * Estrategia:
 *  1. Prioriza las apariciones que siguen a la palabra "lote" (con separadores
 *     opcionales como ":" o "-"), que es la intencion mas clara.
 *  2. Si no, busca el numero como token independiente. Usa limites de palabra
 *     para que "5" no matchee dentro de "15".
 *
 * Los candidatos se evaluan de mas especifico a menos especifico, de modo que
 * "L1.7" gane sobre "L1" si ambos estan presentes.
 *
 * Devuelve el lote coincidente o null si no se pudo deducir uno.
 */
export function detectarLoteEnNotas<T extends { id_lote: number; numero_lote: string }>(
  notas: string | null | undefined,
  lotesDisponibles: T[],
): T | null {
  const texto = String(notas ?? "").trim().toLowerCase();
  if (!texto) return null;

  const escapar = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const candidatos = [...lotesDisponibles]
    .filter((l) => String(l.numero_lote ?? "").trim() !== "")
    .sort((a, b) => String(b.numero_lote).length - String(a.numero_lote).length);

  // 1) Tras la palabra "lote": "lote 5", "lote: H3", "lote - L1.7".
  for (const lote of candidatos) {
    const numero = escapar(String(lote.numero_lote).trim().toLowerCase());
    if (new RegExp(`\\blote\\s*[:\\-]?\\s*${numero}\\b`).test(texto)) return lote;
  }

  // 2) Token suelto en cualquier lugar del texto.
  for (const lote of candidatos) {
    const numero = escapar(String(lote.numero_lote).trim().toLowerCase());
    if (new RegExp(`\\b${numero}\\b`).test(texto)) return lote;
  }

  return null;
}
