import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  estructuraContrato,
} from "@/application/contratos/services/estructuraContrato";
import type {
  BloqueDocumento,
  ContenidoContrato,
  FormatoDocumentoContrato,
  GeneradorDocumentoContrato,
} from "@/application/contratos/ports/GeneradorDocumentoContrato";

/** Convierte un bloque de texto plano en los párrafos del Word. */
function parrafosDe(bloque: BloqueDocumento): (Paragraph | Table)[] {
  switch (bloque.tipo) {
    case "titulo":
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: bloque.texto, bold: true, size: 32, color: "082B33" })],
        }),
      ];
    case "subtitulo":
      return [
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: bloque.texto, bold: true, size: 24, color: "082B33" })],
        }),
      ];
    case "parrafo":
      return [
        new Paragraph({
          spacing: { after: 160, line: 300 },
          children: [new TextRun({ text: bloque.texto, size: 22 })],
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
      sections: [{ properties: {}, children: hijos }],
    });

    // Packer.toBlob ya entrega un Blob listo para descargar o subir.
    return Packer.toBlob(doc);
  }
}
