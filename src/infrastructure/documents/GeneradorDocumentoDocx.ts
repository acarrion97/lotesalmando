import {
  AlignmentType,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { estructuraContrato } from "@/application/contratos/services/estructuraContrato";
import type {
  BloqueDocumento,
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
  SegmentoTexto,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";

/** A4 en twips y márgenes de 2,54 cm: el papel del documento original. */
const PAGINA = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};

/** Texto corrido justificado, como el documento original. */
const INTERLINEADO = { after: 160, line: 259 };

/** Convierte un bloque de texto plano en los párrafos del Word. */
function parrafosDe(bloque: BloqueDocumento): (Paragraph | Table)[] {
  switch (bloque.tipo) {
    case "titulo":
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          // Interlineado 1,5, como el título del documento original.
          spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: bloque.texto,
              bold: true,
              size: 24,
              font: "Bookman Old Style",
            }),
          ],
        }),
      ];
    case "subtitulo":
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: bloque.texto, bold: true, size: 22 })],
        }),
      ];
    case "clausula":
      return [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: INTERLINEADO,
          children: [
            new TextRun({ text: `${bloque.encabezado} `, bold: true, size: 22 }),
            ...bloque.cuerpo.map((segmento: SegmentoTexto) =>
              new TextRun({ text: segmento.texto, bold: segmento.negrita, size: 22 }),
            ),
          ],
        }),
      ];
    case "parrafo":
      return [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: INTERLINEADO,
          children: [new TextRun({ text: bloque.texto, size: 22, bold: bloque.negrita })],
        }),
      ];
    case "etiqueta_valor":
      return [
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: `${bloque.etiqueta}: `, bold: true, size: 22 }),
            new TextRun({ text: bloque.valor, size: 22 }),
          ],
        }),
      ];
    case "tabla":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: bloque.encabezados.map(
                (encabezado) =>
                  new TableCell({
                    shading: { fill: "F0F4F4" },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: encabezado, bold: true, size: 20 })],
                      }),
                    ],
                  }),
              ),
            }),
            ...bloque.filas.map(
              (fila) =>
                new TableRow({
                  children: fila.map(
                    (celda) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: celda, size: 20 })] })],
                      }),
                  ),
                }),
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      ];
    case "firmas":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: "none", size: 0, color: "FFFFFF" },
            bottom: { style: "none", size: 0, color: "FFFFFF" },
            left: { style: "none", size: 0, color: "FFFFFF" },
            right: { style: "none", size: 0, color: "FFFFFF" },
            insideHorizontal: { style: "none", size: 0, color: "FFFFFF" },
            insideVertical: { style: "none", size: 0, color: "FFFFFF" },
          },
          rows: [
            // Una fila vacía: es el espacio donde se firma.
            new TableRow({
              children: bloque.columnas.map(
                () =>
                  new TableCell({
                    children: [new Paragraph({ spacing: { after: 480 }, children: [] })],
                  }),
              ),
            }),
            ...[0, 1, 2].map((indiceLinea) =>
              new TableRow({
                children: bloque.columnas.map(
                  (columna) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            // Bloque de firmas en negrita, como el original
                            // (que no lleva subrayado).
                            new TextRun({
                              text: columna.lineas[indiceLinea] ?? "",
                              bold: true,
                              size: 22,
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      ];
    case "espacio":
      return [new Paragraph({ spacing: { after: 120 }, children: [] })];
  }
}

/** Genera el contrato en Word (.docx), en el navegador y sin servidor. */
export class GeneradorDocumentoDocx implements GeneradorDocumentoContrato {
  async generar(formato: FormatoDocumentoContrato, contenido: ContenidoContrato): Promise<Blob> {
    if (formato !== "docx") throw new Error("Este generador solo produce Word (.docx)");

    const plano = estructuraContrato(contenido);
    const hijos = plano.bloques.flatMap(parrafosDe);

    const doc = new Document({
      creator: contenido.empresa.nombre || "Lotes al Mando",
      title: `${plano.titulo} ${contenido.numero_contrato}`,
      styles: {
        default: {
          document: { run: { font: "Calibri", size: 22 } },
        },
      },
      sections: [{ properties: { page: PAGINA }, children: hijos }],
    });

    // Packer.toBlob ya entrega un Blob listo para descargar o subir.
    return Packer.toBlob(doc);
  }
}
