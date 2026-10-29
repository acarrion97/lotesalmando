/**
 * Proveedor de refresco de la escena (tarea 5.3 del cambio
 * cesium-vista-3d-mapas).
 *
 * El contrato es `subscribe(cb)` / `dispose()`, y el *productor* de eventos es
 * intercambiable: hoy es un `setInterval`, y cuando exista una fuente en vivo
 * (Supabase Realtime, un WebSocket) se sustituye sin tocar esta escena ni a
 * sus consumidores (design.md D5). No se inventa ningún endpoint: el productor
 * nuevo se conectará cuando su fuente de datos exista.
 */

/** Suscribe un callback al productor y devuelve la función de baja. */
export type ProductorRefresco = (onRefresco: () => void) => () => void;

export interface ProveedorRefresco {
  /** Da de alta un suscriptor; devuelve su baja. Idempotente al disponer. */
  subscribe(onRefresco: () => void): () => void;
  /** Retira el productor y todos los suscriptores. Tras esto el proveedor queda inerte. */
  dispose(): void;
}

/** Caducidad del refresco por defecto: un productor por minuto. */
export const INTERVALO_REFRESCO_MS = 60_000;

/**
 * El productor de hoy: un temporizador. Se crea con el primer suscriptor y se
 * retira con el último, para no dejar ticks huérfanos corriendo sin nadie que
 * los consuma.
 */
export function productorPorIntervalo(intervaloMs: number): ProductorRefresco {
  return (onRefresco) => {
    const id = setInterval(onRefresco, intervaloMs);
    return () => clearInterval(id);
  };
}

export function crearProveedorRefresco(productor: ProductorRefresco): ProveedorRefresco {
  const suscriptores = new Set<() => void>();
  let bajaProductor: (() => void) | null = null;
  let desechado = false;

  const notificar = (): void => {
    if (desechado) return;
    // Copia: un suscriptor puede darse de baja a sí mismo dentro del callback.
    for (const suscriptor of [...suscriptores]) suscriptor();
  };

  return {
    subscribe(onRefresco) {
      if (desechado) return () => {};
      suscriptores.add(onRefresco);
      bajaProductor ??= productor(notificar);
      return () => {
        suscriptores.delete(onRefresco);
        if (suscriptores.size === 0 && bajaProductor) {
          bajaProductor();
          bajaProductor = null;
        }
      };
    },
    dispose() {
      desechado = true;
      if (bajaProductor) {
        bajaProductor();
        bajaProductor = null;
      }
      suscriptores.clear();
    },
  };
}
