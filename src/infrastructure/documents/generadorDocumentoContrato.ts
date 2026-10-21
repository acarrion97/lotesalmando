import type {
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";

/**
 * Fachada: elige el generador por el formato pedido. Todo pasa en el
 * navegador (docx y jspdf son librerías puras), así que no hay función
 * de servidor ni API de terceros de por medio.
 *
 * Las librerías se importan bajo demanda: `docx` y `jspdf` pesan cerca
 * de 1 MB entre las dos y solo se usan cuando alguien pide generar un
 * documento. Si entraran en el bundle principal lo pasarían de peso para
 * la precarga del service worker (workbox corta en 3 MiB) y harían
 * arrancar más lento a todos los que solo abren la app.
 */
export const generadorDocumentoContrato: GeneradorDocumentoContrato = {
  async generar(formato: FormatoDocumentoContrato, contenido: ContenidoContrato): Promise<Blob> {
    if (formato === "docx") {
      const { GeneradorDocumentoDocx } = await import("./GeneradorDocumentoDocx");
      return new GeneradorDocumentoDocx().generar(formato, contenido);
    }
    const { GeneradorDocumentoPdf } = await import("./GeneradorDocumentoPdf");
    return new GeneradorDocumentoPdf().generar(formato, contenido);
  },
};
