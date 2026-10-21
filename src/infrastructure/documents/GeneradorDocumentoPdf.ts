import { jsPDF } from "jspdf";
import { estructuraContrato } from "@/application/contratos/services/estructuraContrato";
import type {
  BloqueDocumento,
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
  SegmentoTexto,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";

/** A4 en puntos: 595.28 x 841.89. */
const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const MARGEN = 72; // 2,54 cm, el margen del documento original
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
const FIN_UTIL = ALTO_PAGINA - MARGEN;

const TINTA: [number, number, number] = [8, 43, 51]; // #082B33
const GRIS: [number, number, number] = [55, 65, 81];
const FONDO_TABLA: [number, number, number] = [240, 244, 244];

const FUENTE = "helvetica";
const FUENTE_TITULO = "times";
const TAMANO = 11;
const INTERLINEA = 14;

/** Palabra con su estilo y si le precede un espacio. */
interface Token {
  texto: string;
  negrita: boolean;
  espacioAntes: boolean;
}

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

    /** Ancho de un texto con la fuente que se está usando. */
    const anchoDe = (texto: string, negrita: boolean, fuente = FUENTE, tamano = TAMANO): number => {
      doc.setFont(fuente, negrita ? "bold" : "normal");
      doc.setFontSize(tamano);
      return doc.getTextWidth(texto);
    };

    /** Parte el texto en palabras, anotando si cada una lleva espacio antes. */
    const tokenizar = (segmentos: SegmentoTexto[]): Token[] => {
      const tokens: Token[] = [];
      let pendienteEspacio = false;

      for (const segmento of segmentos) {
        const partes = segmento.texto.split(/(\s+)/);
        for (const parte of partes) {
          if (!parte) continue;
          if (/^\s+$/.test(parte)) {
            pendienteEspacio = true;
            continue;
          }
          tokens.push({ texto: parte, negrita: !!segmento.negrita, espacioAntes: pendienteEspacio });
          pendienteEspacio = false;
        }
      }
      return tokens;
    };

    /**
     * Parte los tokens en líneas que quepan en el ancho útil. Cada palabra
     * se mide con su propia fuente (normal o negrita).
     */
    const envolver = (tokens: Token[]): Token[][] => {
      const lineas: Token[][] = [];
      let actual: Token[] = [];
      let anchoActual = 0;

      for (const token of tokens) {
        const ancho = anchoDe(token.texto, token.negrita);
        const anchoEspacio = anchoDe(" ", token.negrita);
        const extra = token.espacioAntes && actual.length > 0 ? anchoEspacio : 0;

        if (actual.length > 0 && anchoActual + extra + ancho > ANCHO_UTIL) {
          lineas.push(actual);
          actual = [];
          anchoActual = 0;
        }
        actual.push(token);
        anchoActual += (actual.length > 1 ? extra : 0) + ancho;
      }
      if (actual.length > 0) lineas.push(actual);
      return lineas;
    };

    /** Dibuja una línea de palabras y la justifica como el documento original. */
    const dibujarLinea = (tokens: Token[], lineaY: number, justificar: boolean) => {
      const espacios = tokens.filter((t) => t.espacioAntes).length;
      const anchoTexto = tokens.reduce(
        (suma, token, indice) =>
          suma +
          anchoDe(token.texto, token.negrita) +
          (indice > 0 && token.espacioAntes ? anchoDe(" ", token.negrita) : 0),
        0,
      );
      const extra =
        justificar && espacios > 0 ? Math.max(0, (ANCHO_UTIL - anchoTexto) / espacios) : 0;

      let x = MARGEN;
      tokens.forEach((token, indice) => {
        if (indice > 0 && token.espacioAntes) {
          x += anchoDe(" ", token.negrita) + extra;
        }
        doc.setFont(FUENTE, token.negrita ? "bold" : "normal");
        doc.setFontSize(TAMANO);
        doc.setTextColor(...GRIS);
        doc.text(token.texto, x, lineaY);
        x += anchoDe(token.texto, token.negrita);
      });
    };

    /** Escribe un párrafo con negritas y lo justifica. */
    const parrafoRico = (segmentos: SegmentoTexto[]) => {
      const tokens = tokenizar(segmentos);
      if (tokens.length === 0) return;

      const lineas = envolver(tokens);
      lineas.forEach((linea, indice) => {
        saltarSiNoCabe(INTERLINEA);
        // La última línea no se justifica (queda al ras de la izquierda).
        dibujarLinea(linea, y + TAMANO, indice < lineas.length - 1);
        y += INTERLINEA;
      });
      y += 6;
    };

    const linea = (texto: string, size: number, color: [number, number, number], negrita = false) => {
      doc.setFont(FUENTE, negrita ? "bold" : "normal");
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
      doc.setFont(FUENTE, "bold");
      doc.setTextColor(...TINTA);
      doc.text(`${etiqueta}:`, MARGEN, y + 11);
      doc.setFont(FUENTE, "normal");
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
        doc.setFont(FUENTE, esEncabezado ? "bold" : "normal");
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

    /** Bloque de firmas: dos columnas, una por firmante. */
    const firmas = (columnas: { lineas: string[] }[]) => {
      const anchoColumna = ANCHO_UTIL / Math.max(2, columnas.length);
      const altoLineas = columnas.reduce(
        (maximo, columna) => Math.max(maximo, columna.lineas.length),
        0,
      );

      // Espacio para firmar.
      y += 60;

      for (let indiceLinea = 0; indiceLinea < altoLineas; indiceLinea += 1) {
        saltarSiNoCabe(INTERLINEA);
        columnas.forEach((columna, indiceColumna) => {
          const texto = columna.lineas[indiceLinea];
          if (!texto) return;
          doc.setFont(FUENTE, indiceLinea === 0 ? "bold" : "normal");
          doc.setFontSize(TAMANO);
          doc.setTextColor(...GRIS);
          doc.text(texto, MARGEN + indiceColumna * anchoColumna, y + TAMANO);
        });
        y += INTERLINEA;
      }
      y += 12;
    };

    for (const bloque of plano.bloques as BloqueDocumento[]) {
      switch (bloque.tipo) {
        case "titulo": {
          doc.setFont(FUENTE_TITULO, "bold");
          doc.setFontSize(12);
          doc.setTextColor(...GRIS);
          const titulo = doc.splitTextToSize(bloque.texto, ANCHO_UTIL) as string[];
          const alto = titulo.length * 16;
          saltarSiNoCabe(alto);
          titulo.forEach((lineaTexto, i) => {
            doc.text(lineaTexto, ANCHO_PAGINA / 2, y + 12 + i * 16, { align: "center" });
          });
          y += alto + 4;
          break;
        }
        case "subtitulo": {
          doc.setFont(FUENTE, "bold");
          doc.setFontSize(TAMANO);
          doc.setTextColor(...GRIS);
          doc.text(bloque.texto, ANCHO_PAGINA / 2, y + TAMANO, { align: "center" });
          y += INTERLINEA + 8;
          break;
        }
        case "clausula":
          parrafoRico([{ texto: `${bloque.encabezado} `, negrita: true }, ...bloque.cuerpo]);
          break;
        case "parrafo":
          parrafoRico([{ texto: bloque.texto }]);
          break;
        case "etiqueta_valor":
          etiquetaValor(bloque.etiqueta, bloque.valor);
          break;
        case "tabla":
          tabla(bloque.encabezados, bloque.filas);
          break;
        case "firmas":
          firmas(bloque.columnas);
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
