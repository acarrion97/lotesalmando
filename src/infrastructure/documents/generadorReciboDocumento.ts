import type { Recibo } from "@/domain/recibo/entities";
import type { GeneradorReciboDocumento } from "@/application/recibos/ports/GeneradorReciboDocumento";

/**
 * Fachada del PDF del recibo. `jspdf` se importa bajo demanda: pesa cerca de
 * 1 MB y solo se usa cuando alguien pide bajar un recibo. Si entrara en el
 * bundle principal lo pasaría de peso para la precarga del service worker
 * (workbox corta en 3 MiB) y haría arrancar más lento a todos los que solo
 * abren la app.
 */
export const generadorReciboDocumento: GeneradorReciboDocumento = {
  async generar(recibo: Recibo): Promise<Blob> {
    const { GeneradorReciboPdf } = await import("./GeneradorReciboPdf");
    return new GeneradorReciboPdf().generar(recibo);
  },
};
