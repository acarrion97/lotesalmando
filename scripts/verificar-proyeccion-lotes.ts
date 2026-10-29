/**
 * Verificación de la proyección de los lotes a WGS84 (tarea 2.2 del cambio
 * cesium-vista-3d-mapas). Se ejecuta con:
 *
 *   node scripts/verificar-proyeccion-lotes.ts
 *
 * Comprueba que `poligonoAWgs84` es el mapeo inverso exacto de la ventana
 * geográfica, que conserva los vértices, que tiene la precisión que hace
 * falta para un lote, y —lo importante— que el polígono cae dentro de la
 * misma rejilla de tiles que dibuja `CapaSatelite`, de modo que las dos
 * capas comparten una sola fuente de verdad.
 */
import { register } from "node:module";

// El alias `@/` no existe para Node: se registra el resolver antes de cargar
// el código de `src/` que lo usa (los import estáticos se resolverían antes).
register("./resolver-alias.mjs", import.meta.url);
const { limitesDelPlano, pxMundo, rejillaTiles } =
  await import("../src/presentation/components/maps/georef.ts");
const { poligonoAWgs84, puntoAWgs84 } =
  await import("../src/presentation/components/maps/cesium/proyectar.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/** Ventana de un plano real: 240 m de ancho, imagen 4:3, en el centro del país. */
const ubicacion = { centro_lat: -0.215, centro_lng: -78.512, ancho_m: 240 };
const limites = limitesDelPlano(ubicacion, 4 / 3);

console.log("Ventana de referencia");
console.log(
  `  ${limites.norte.toFixed(6)} / ${limites.sur.toFixed(6)} / ` +
    `${limites.oeste.toFixed(6)} / ${limites.este.toFixed(6)}`,
);
verificar("norte > sur", limites.norte > limites.sur);
verificar("este > oeste", limites.este > limites.oeste);
verificar(
  "el centro está dentro de la ventana",
  limites.este > ubicacion.centro_lng && limites.oeste < ubicacion.centro_lng,
);

console.log("Toda la ventana [0..1]² son las cuatro esquinas");
const esquinas = poligonoAWgs84(
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
  limites,
);
const TOLERANCIA = 1e-9;
verificar(
  "(0,0) es la esquina noroeste",
  Math.abs(esquinas[0][0] - limites.oeste) < TOLERANCIA &&
    Math.abs(esquinas[0][1] - limites.norte) < TOLERANCIA,
  esquinas[0],
);
verificar(
  "(1,0) es la esquina noreste",
  Math.abs(esquinas[1][0] - limites.este) < TOLERANCIA &&
    Math.abs(esquinas[1][1] - limites.norte) < TOLERANCIA,
  esquinas[1],
);
verificar(
  "(1,1) es la esquina sureste",
  Math.abs(esquinas[2][0] - limites.este) < TOLERANCIA &&
    Math.abs(esquinas[2][1] - limites.sur) < TOLERANCIA,
  esquinas[2],
);
verificar(
  "(0,1) es la esquina suroeste",
  Math.abs(esquinas[3][0] - limites.oeste) < TOLERANCIA &&
    Math.abs(esquinas[3][1] - limites.sur) < TOLERANCIA,
  esquinas[3],
);

console.log("Redondeo: ida y vuelta normalizado -> WGS84 -> normalizado");
const anchoGrados = limites.este - limites.oeste;
const altoGrados = limites.norte - limites.sur;
const aNormalizado = ([lng, lat]: [number, number]) => ({
  x: (lng - limites.oeste) / anchoGrados,
  y: (limites.norte - lat) / altoGrados,
});

let peorIdaVuelta = 0;
for (let i = 0; i <= 20; i++) {
  for (let j = 0; j <= 20; j++) {
    const x = i / 20;
    const y = j / 20;
    const [lng, lat] = puntoAWgs84([x, y], limites);
    const vuelta = aNormalizado([lng, lat]);
    peorIdaVuelta = Math.max(peorIdaVuelta, Math.abs(vuelta.x - x), Math.abs(vuelta.y - y));
  }
}
verificar(
  `ida y vuelta con error menor a ${TOLERANCIA} (peor: ${peorIdaVuelta.toExponential(2)})`,
  peorIdaVuelta < TOLERANCIA,
);

console.log("Precisión para un lote de 10 m");
// A esta latitud un grado de longitud son ~111.319 m, así que 10 m piden
// ~9e-5 grados. Se comprueba que dos vértices a 10 m no colapsan al redondear.
const [lngA] = puntoAWgs84([0.5, 0.5], limites);
const [lngB] = puntoAWgs84([0.5 + 10 / ubicacion.ancho_m, 0.5], limites);
const separacionGrados = Math.abs(lngB - lngA);
verificar(
  `10 m se resuelven como ${separacionGrados.toExponential(3)} grados (nada de 0)`,
  separacionGrados > 8e-5 && separacionGrados < 1e-4,
  separacionGrados,
);
verificar(
  "10 m sobreviven a 7 decimales de latitud/lng",
  Number(lngA.toFixed(7)) !== Number(lngB.toFixed(7)),
);

console.log("Conserva el contorno");
const unLote = [
  [0.2, 0.3],
  [0.4, 0.3],
  [0.4, 0.5],
  [0.2, 0.5],
];
const proyectado = poligonoAWgs84(unLote, limites);
verificar("mismo número de vértices", proyectado.length === unLote.length);
verificar(
  "mismo orden de vértices",
  proyectado.every(([lng], i) => Math.abs(lng - puntoAWgs84(unLote[i], limites)[0]) < 1e-12),
);
verificar("polígono vacío -> vacío", poligonoAWgs84([], limites).length === 0);

console.log("Totalidad: un punto fuera de [0..1] se proyecta igual, sin romper");
const fuera = poligonoAWgs84(
  [
    [-0.1, 1.2],
    [2, -0.5],
  ],
  limites,
);
verificar("devuelve 2 puntos", fuera.length === 2);
verificar(
  "sigue siendo lineal",
  Math.abs(fuera[0][0] - (limites.oeste + -0.1 * anchoGrados)) < 1e-12,
  fuera[0],
);

console.log("Coherencia con la capa satélite (la misma ventana, dos dibujos)");
const ANCHO_CAJA = 600;
const rejilla = rejillaTiles(limites, ANCHO_CAJA);
const origen = pxMundo(limites.oeste, limites.norte, rejilla.zoom);
let peorPixel = 0;
for (let i = 0; i <= 10; i++) {
  for (let j = 0; j <= 10; j++) {
    const x = i / 10;
    const y = j / 10;
    const [lng, lat] = puntoAWgs84([x, y], limites);
    const px = pxMundo(lng, lat, rejilla.zoom);
    // Dónde debería caer el punto dentro del bloque de tiles que dibuja la capa.
    peorPixel = Math.max(
      peorPixel,
      Math.abs(px.x - origen.x - x * rejilla.anchoPx),
      Math.abs(px.y - origen.y - y * rejilla.altoPx),
    );
  }
}
verificar(
  `el polígono cae sobre la rejilla satélite (peor desvío: ${peorPixel.toExponential(2)} px)`,
  peorPixel < 0.01,
  peorPixel,
);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
