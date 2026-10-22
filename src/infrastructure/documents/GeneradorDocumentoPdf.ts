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

const GRIS: [number, number, number] = [55, 65, 81];

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
          // Bloque de firmas en negrita, como el documento original.
          doc.setFont(FUENTE, "bold");
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
          parrafoRico([{ texto: bloque.texto, negrita: bloque.negrita }]);
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
