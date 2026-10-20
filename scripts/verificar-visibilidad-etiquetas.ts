/**
 * Verificación de la visibilidad de las etiquetas (tarea 2.2 del cambio
 * improve-public-lotization-map). Se ejecuta con:
 *
 *   node scripts/verificar-visibilidad-etiquetas.ts
 */
import type { PuntoPlano } from "../src/domain/lote/entities/index.ts";
import {
  ALTO_MINIMO_ETIQUETA_PX,
  TAMANO_FUENTE_ETIQUETA_PX,
  centroPoligono,
  etiquetaVisible,
} from "../src/utils/mapas/visibilidadEtiquetas.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/**
 * El plano de ciudadela-san-lucas mide 7017 x 4959 px naturales y se dibuja a
 * 623 x 440 px con el visor a pantalla completa sin zoom; el lote mediano
 * ocupa 26,4 x 18,4 px de pantalla.
 */
const planoSinZoom = { ancho: 623, alto: 440 };
const loteMediano: PuntoPlano[] = [
  [0, 0],
  [26.4 / 623, 0],
  [26.4 / 623, 18.4 / 440],
  [0, 18.4 / 440],
];

function rectanguloPx(anchoPx: number, altoPx: number, plano = planoSinZoom): PuntoPlano[] {
  return [
    [0, 0],
    [anchoPx / plano.ancho, 0],
    [anchoPx / plano.ancho, altoPx / plano.alto],
    [0, altoPx / plano.alto],
  ];
}

console.log("Cuerpo de fuente del plano");
verificar(
  `la etiqueta se pinta a ${TAMANO_FUENTE_ETIQUETA_PX} px y necesita ${ALTO_MINIMO_ETIQUETA_PX} px de alto`,
  TAMANO_FUENTE_ETIQUETA_PX === 11 && ALTO_MINIMO_ETIQUETA_PX === 15,
);

console.log("El texto corto cabe en un lote mediano sin zoom");
verificar(
  "'H1' (2 letras) cabe en 26,4 x 18,4 px",
  etiquetaVisible(loteMediano, planoSinZoom, "H1"),
);
verificar(
  "'H10' (3 letras) cabe en 26,4 x 18,4 px",
  etiquetaVisible(loteMediano, planoSinZoom, "H10"),
);

console.log("El texto largo no cabe y no se pinta");
verificar(
  "'L1.10' (5 letras) no cabe en un lote mediano",
  !etiquetaVisible(loteMediano, planoSinZoom, "L1.10"),
);

console.log("El resultado varía con la escala");
verificar(
  "alejado a la mitad, 'H1' ya no cabe",
  !etiquetaVisible(loteMediano, { ancho: 311, alto: 220 }, "H1"),
);
verificar(
  "acercado al doble, 'L1.10' sí cabe",
  etiquetaVisible(loteMediano, { ancho: 1246, alto: 880 }, "L1.10"),
);

console.log("Lotes de tamaños distintos con la misma etiqueta");
verificar(
  "un lote grande sí admite 'L1.10'",
  etiquetaVisible(rectanguloPx(80, 60), planoSinZoom, "L1.10"),
);
verificar(
  "un lote pequeño no admite ni 'H1'",
  !etiquetaVisible(rectanguloPx(12, 10), planoSinZoom, "H1"),
);

console.log("Sin texto, sin contorno o sin plano no se etiqueta");
verificar("etiqueta nula -> no se pinta", !etiquetaVisible(loteMediano, planoSinZoom, null));
verificar("etiqueta vacía -> no se pinta", !etiquetaVisible(loteMediano, planoSinZoom, ""));
verificar(
  "polígono nulo -> no se pinta",
  !etiquetaVisible(null, planoSinZoom, "H1"),
);
verificar(
  "polígono vacío -> no se pinta",
  !etiquetaVisible([], planoSinZoom, "H1"),
);
verificar(
  "polígono de dos puntos -> no se pinta",
  !etiquetaVisible(
    [
      [0, 0],
      [0.5, 0.5],
    ],
    planoSinZoom,
    "H1",
  ),
);
verificar(
  "plano de tamaño cero -> no se pinta",
  !etiquetaVisible(loteMediano, { ancho: 0, alto: 0 }, "H1"),
);
verificar(
  "plano aún no medido (NaN) -> no se pinta",
  !etiquetaVisible(loteMediano, { ancho: Number.NaN, alto: 440 }, "H1"),
);

console.log("La regla usa el ancho y el alto del plano, no solo uno");
verificar(
  "un plano partido en vertical deja de caber el texto",
  !etiquetaVisible(loteMediano, { ancho: 623, alto: 10 }, "H1"),
);

console.log("Centro de la etiqueta");
verificar(
  "el centro de un rectángulo es su medio",
  JSON.stringify(centroPoligono(rectanguloPx(26.4, 18.4))) ===
    JSON.stringify([0.02118780096308186, 0.02090909090909091]),
  centroPoligono(rectanguloPx(26.4, 18.4)),
);
verificar(
  "los contornos del plano son cuadriláteros, como el que dibuja el editor",
  centroPoligono([
    [0.02, 0.1],
    [0.12, 0.08],
    [0.14, 0.28],
    [0.04, 0.3],
  ]) !== null,
);
verificar("un polígono de un punto no tiene centro", centroPoligono([[0.5, 0.5]]) === null);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
