import type {
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";
import { GeneradorDocumentoDocx } from "./GeneradorDocumentoDocx";
import { GeneradorDocumentoPdf } from "./GeneradorDocumentoPdf";

const docx = new GeneradorDocumentoDocx();
const pdf = new GeneradorDocumentoPdf();

/**
 * Fachada: elige el generador por el formato pedido. Todo pasa en el
 * navegador (docx y jspdf son librerías puras), así que no hay función
 * de servidor ni API de terceros de por medio.
 */
export const generadorDocumentoContrato: GeneradorDocumentoContrato = {
  generar(formato: FormatoDocumentoContrato, contenido: ContenidoContrato): Promise<Blob> {
    return formato === "docx" ? docx.generar(formato, contenido) : pdf.generar(formato, contenido);
  },
};
