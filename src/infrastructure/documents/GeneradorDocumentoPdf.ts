import { jsPDF } from "jspdf";
import { estructuraContrato } from "@/application/contratos/services/estructuraContrato";
import type {
  BloqueDocumento,
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";

/** A4 en puntos: 595.28 x 841.89. */
const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const MARGEN = 48;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
const FIN_UTIL = ALTO_PAGINA - MARGEN;

const TINTA: [number, number, number] = [8, 43, 51]; // #082B33
const GRIS: [number, number, number] = [55, 65, 81];
const FONDO_TABLA: [number, number, number] = [240, 244, 244];

/** Genera el contrato en PDF, en el navegador y sin servidor. */
export class GeneradorDocumentoPdf implements GeneradorDocumentoContrato {
  async generar(formato: FormatoDocumentoContrato, contenido: ContenidoContrato): Promise<Blob> {
    if (formato !== "pdf") throw new Error("Este generador solo produce PDF");

    const plano = estructuraContrato(contenido);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setTextColor(...GRIS);

    let y = MARGEN;

    const saltarSiNoCabe = (alto: number) => {
      if (y + alto > FIN_UTIL) {
        doc.addPage();
        y = MARGEN;
      }
    };

    const linea = (texto: string, size: number, color: [number, number, number], negrita = false) => {
      doc.setFont("helvetica", negrita ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lineas = doc.splitTextToSize(texto, ANCHO_UTIL) as string[];
      const alto = lineas.length * (size + 4);
      saltarSiNoCabe(alto);
      lineas.forEach((l, i) => {
        doc.text(l, MARGEN, y + size + i * (size + 4));
      });
      y += alto + 6;
      doc.setTextColor(...GRIS);
    };

    const etiquetaValor = (etiqueta: string, valor: string) => {
      doc.setFontSize(11);
      const anchoEtiqueta = doc.getTextWidth(`${etiqueta}: `);
      const lineasValor = doc.splitTextToSize(valor, ANCHO_UTIL - anchoEtiqueta) as string[];
      const alto = Math.max(1, lineasValor.length) * 15;
      saltarSiNoCabe(alto);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TINTA);
      doc.text(`${etiqueta}:`, MARGEN, y + 11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRIS);
      lineasValor.forEach((l, i) => doc.text(l, MARGEN + anchoEtiqueta, y + 11 + i * 15));
      y += alto + 2;
    };

    const tabla = (encabezados: string[], filas: string[][]) => {
      const columnas = encabezados.length;
      const anchoColumna = ANCHO_UTIL / columnas;
      const altoFila = 20;

      const fila = (celdas: string[], esEncabezado: boolean, indice: number) => {
        saltarSiNoCabe(altoFila);
        if (esEncabezado) {
          doc.setFillColor(...FONDO_TABLA);
          doc.rect(MARGEN, y, ANCHO_UTIL, altoFila, "F");
        } else if (indice % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(MARGEN, y, ANCHO_UTIL, altoFila, "F");
        }
        doc.setFont("helvetica", esEncabezado ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(...(esEncabezado ? TINTA : GRIS));
        celdas.forEach((celda, i) => {
          doc.text(celda, MARGEN + i * anchoColumna + 6, y + 13, { maxWidth: anchoColumna - 12 });
        });
        y += altoFila;
      };

      fila(encabezados, true, 0);
      filas.forEach((celdas, i) => fila(celdas, false, i));
      doc.setDrawColor(220, 222, 224);
      doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
      y += 14;
    };

    for (const bloque of plano.bloques as BloqueDocumento[]) {
      switch (bloque.tipo) {
        case "titulo":
          linea(bloque.texto, 18, TINTA, true);
          y += 8;
          break;
        case "subtitulo":
          y += 6;
          linea(bloque.texto, 13, TINTA, true);
          break;
        case "parrafo":
          linea(bloque.texto, 11, GRIS);
          break;
        case "etiqueta_valor":
          etiquetaValor(bloque.etiqueta, bloque.valor);
          break;
        case "tabla":
          tabla(bloque.encabezados, bloque.filas);
          break;
        case "espacio":
          y += 12;
          break;
      }
    }

    // output("blob") deja el PDF como Blob, igual que el Word.
    return doc.output("blob");
  }
}
