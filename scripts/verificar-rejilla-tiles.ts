/**
 * Verifica el nivel de zoom, sobremuestreo y recorte de fallback de la capa
 * satelital (fase 7 de cesium-vista-3d-mapas).
 *
 * Ejecutar con: node scripts/verificar-rejilla-tiles.ts
 */
import { register } from "node:module";

register("./resolver-alias.mjs", import.meta.url);
const { limitesDelPlano, recorteTileAncestro, rejillaTiles } =
  await import("../src/presentation/components/maps/georef.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

const ubicacion = { centro_lat: -0.215, centro_lng: -78.512, ancho_m: 240 };
const limites = limitesDelPlano(ubicacion, 4 / 3);

console.log("Zoom y sobremuestreo");
const ventanaChica = rejillaTiles(limites, 200);
const ventanaReferencia = rejillaTiles(limites, 600);
const ventanaGrande = rejillaTiles(limites, 1200);
verificar(
  "la ventana de 600 px pide zoom 20",
  ventanaReferencia.zoom === 20,
  ventanaReferencia.zoom,
);
verificar(
  "el zoom aumenta al ampliar la ventana antes de alcanzar el techo",
  ventanaChica.zoom < ventanaReferencia.zoom,
  [ventanaChica.zoom, ventanaReferencia.zoom],
);
verificar(
  "el zoom no supera el techo 20 al ampliar más",
  ventanaGrande.zoom === 20,
  ventanaGrande.zoom,
);
verificar(
  "el sobremuestreo pedido es 3× el ancho de la caja",
  ventanaReferencia.anchoPx >= 600 * 2.5,
  ventanaReferencia.anchoPx / 600,
);
console.log(
  `  muestreo efectivo de referencia: ${(ventanaReferencia.anchoPx / 600).toFixed(2)}× ` +
    `(techo de zoom ${ventanaReferencia.zoom})`,
);

console.log("Resolución física del viewport");
const limitesHiDpi = limitesDelPlano({ ...ubicacion, ancho_m: 2000 }, 4 / 3);
const rejillasDpr = [1, 1.5, 2, 3].map((dpr) => ({
  dpr,
  rejilla: rejillaTiles(limitesHiDpi, 600 * dpr, 20),
}));
verificar(
  "el nivel no disminuye al aumentar la densidad de pantalla",
  rejillasDpr.every(
    ({ rejilla }, i) => i === 0 || rejilla.zoom >= rejillasDpr[i - 1].rejilla.zoom,
  ),
  rejillasDpr.map(({ dpr, rejilla }) => [dpr, rejilla.zoom]),
);
verificar(
  "DPR 3 selecciona más detalle que DPR 1 cuando hay cobertura",
  rejillasDpr[3].rejilla.zoom > rejillasDpr[0].rejilla.zoom,
  rejillasDpr.map(({ dpr, rejilla }) => [dpr, rejilla.zoom]),
);
verificar(
  "la rejilla no supera el techo de cobertura",
  rejillasDpr.every(({ rejilla }) => rejilla.zoom <= 20),
  rejillasDpr.map(({ dpr, rejilla }) => [dpr, rejilla.zoom]),
);

console.log("Recorte del tile ancestro");
let hijosVerificados = 0;
for (let zoomPedido = 1; zoomPedido <= 12; zoomPedido++) {
  const maxTile = 2 ** zoomPedido - 1;
  for (const [x, y] of [
    [0, 0],
    [maxTile, maxTile],
    [Math.floor(maxTile / 2), Math.floor(maxTile / 3)],
  ]) {
    for (const diferencia of [1, Math.min(3, zoomPedido)]) {
      const zoomAncestro = zoomPedido - diferencia;
      const recorte = recorteTileAncestro(zoomPedido, x, y, zoomAncestro);
      const escala = 2 ** diferencia;
      verificar(
        `z${zoomPedido}/${x}/${y} está dentro del ancestro z${zoomAncestro}`,
        recorte.x * escala + Math.floor(recorte.desplazamientoX / 256) === x &&
          recorte.y * escala + Math.floor(recorte.desplazamientoY / 256) === y &&
          recorte.escala === escala,
        recorte,
      );
      hijosVerificados++;
    }
  }
}
verificar(
  "el extremo de zoom 20 se recorta desde z18",
  (() => {
    const recorte = recorteTileAncestro(20, 765432, 456789, 18);
    return (
      recorte.x === Math.floor(765432 / 4) &&
      recorte.y === Math.floor(456789 / 4) &&
      recorte.escala === 4 &&
      recorte.desplazamientoX < 4 * 256 &&
      recorte.desplazamientoY < 4 * 256
    );
  })(),
);
verificar(
  "coordenadas inválidas se rechazan",
  (() => {
    try {
      recorteTileAncestro(4, 16, 0, 2);
      return false;
    } catch (error) {
      return error instanceof RangeError;
    }
  })(),
);

console.log(`${hijosVerificados} casos de recorte evaluados`);
if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
