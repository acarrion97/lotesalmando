/**
 * Verificación de cobertura de la capa satélite (tarea 7.4 del cambio
 * cesium-vista-3d-mapas). Se ejecuta con:
 *
 *   node scripts/verificar-cobertura-satelite.ts
 *
 * Qué comprueba, sobre la ubicación REAL del único proyecto publicado con GPS
 * (Ciudadela San Lucas, Machala; la misma que usó el spike de la 9.1):
 *
 *   1. **Techo de cobertura.** Esri no publica imágenes a todos los niveles
 *      en todas partes. Aquí llega a z18; z19 y z20 devuelven tiles de aviso
 *      con HTTP 200, no un error. Se verifica que el techo detectado es el
 *      que realmente cubre la ventana.
 *   2. **Plano completo y redimensionado, con el techo aplicado.** Cada ancho
 *      de caja es exactamente lo que produce un `ResizeObserver` al cambiar
 *      el tamaño de la ventana, así que el barrido de anchos ES el escenario
 *      de la tarea. Con `rejillaTiles()` limitado a ese techo, todos los
 *      tiles pedidos tienen datos: no hay baldosa que baje al fallback ni
 *      degradado verde a la vista.
 *   3. **Red de seguridad.** Aun con el techo, un nivel por debajo sigue
 *      estando completo, de modo que si el proveedor retirara una imagen el
 *      descenso de `CapaSatelite` tiene dónde caer.
 *   4. **Coste.** Se comparan los tiles del grid con y sin techo. Es lo
 *      medible de "sin regresión de rendimiento perceptible": pedir niveles
 *      inexistentes multiplicaba las peticiones sin ganar resolución.
 *
 * Usa los módulos de producción (`georef.ts` y `tilesEsri.ts`), no una
 * reescritura: lo que se verifica es el código que corre en el navegador.
 *
 * Consulta el endpoint público `tilemap` de Esri, así que NECESITA RED y
 * consume tráfico de terceros. No es una prueba de regresión determinista.
 */
import { register } from "node:module";

// El alias `@/` no existe para Node: se registra el resolver antes de cargar
// el código de `src/` que lo usa (los import estáticos se resolverían antes).
register("./resolver-alias.mjs", import.meta.url);
const { limitesDelPlano, rejillaTiles } =
  await import("../src/presentation/components/maps/georef.ts");
const { disponibilidadTilesEsri, nivelMaximoEsriConCobertura } =
  await import("../src/presentation/components/maps/tilesEsri.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/** Ubicación real registrada en design.md → Open Questions (spike 9.1). */
const ubicacion = {
  centro_lat: -3.31480187245578,
  centro_lng: -79.9554215423267,
  ancho_m: 500,
};
const limites = limitesDelPlano(ubicacion, 4 / 3);

/** Anchos de caja que produce un redimensionado: móvil estrecho → escritorio. */
const ANCHOS = [320, 480, 600, 1000, 1600];
/** Tope de tiles por rejilla que se considera razonable para una ventana. */
const TOPE_TILES = 200;
/** Techo de resolución de `rejillaTiles` (tarea 7.1). */
const ZOOM_RESOLUCION = 20;

async function comprobar(
  zoom: number,
  tiles: readonly { x: number; y: number }[],
): Promise<readonly boolean[]> {
  try {
    const disponibles = await disponibilidadTilesEsri(zoom, tiles);
    return tiles.map((tile) => disponibles.get(`${tile.x}/${tile.y}`) === true);
  } catch (error) {
    console.error("No se pudo consultar el endpoint tilemap de Esri.", error);
    throw error;
  }
}

/** Tiles ancestros un nivel por debajo, igual que baja `CapaSatelite`. */
function ancestros(
  zoom: number,
  tiles: readonly { x: number; y: number }[],
): { x: number; y: number }[] {
  const unicos = new Map<string, { x: number; y: number }>();
  for (const tile of tiles) {
    unicos.set(`${Math.floor(tile.x / 2)}/${Math.floor(tile.y / 2)}`, {
      x: Math.floor(tile.x / 2),
      y: Math.floor(tile.y / 2),
    });
  }
  return [...unicos.values()];
}

console.log("Ventana del plano real (Machala):");
console.log(
  `  ${limites.norte.toFixed(6)} / ${limites.sur.toFixed(6)} / ` +
    `${limites.oeste.toFixed(6)} / ${limites.este.toFixed(6)}`,
);

console.log("Techo de cobertura: el nivel que Esri publica de verdad aquí");
const techo = await nivelMaximoEsriConCobertura(limites, ZOOM_RESOLUCION);
verificar(
  `Esri cubre hasta z${techo} en esta ventana`,
  techo !== null && techo >= 15 && techo <= ZOOM_RESOLUCION,
  techo,
);

if (techo !== null) {
  console.log("Baldosas: con el techo aplicado, todo tile pedido tiene datos");
  for (const ancho of ANCHOS) {
    const rejilla = rejillaTiles(limites, ancho, techo);
    const resultado = await comprobar(
      rejilla.zoom,
      rejilla.tiles.map(({ x, y }) => ({ x, y })),
    );
    const sinDatos = resultado.filter((disponible) => !disponible).length;
    verificar(
      `caja de ${ancho} px: ${sinDatos} de ${resultado.length} tiles sin datos en z${rejilla.zoom}`,
      sinDatos === 0 && rejilla.tiles.length > 0 && rejilla.tiles.length <= TOPE_TILES,
      rejilla.tiles.filter((_, i) => !resultado[i]).slice(0, 5),
    );
  }

  console.log("Red de seguridad: el nivel inmediatamente inferior sigue completo");
  const rejilla = rejillaTiles(limites, 600, techo);
  const padres = ancestros(
    rejilla.zoom,
    rejilla.tiles.map(({ x, y }) => ({ x, y })),
  );
  const resultadoPadres = await comprobar(rejilla.zoom - 1, padres);
  const padresSinDatos = resultadoPadres.filter((disponible) => !disponible).length;
  verificar(
    `los ${padres.length} ancestros de z${rejilla.zoom} tienen datos en z${rejilla.zoom - 1}`,
    padresSinDatos === 0,
    padres.filter((_, i) => !resultadoPadres[i]).slice(0, 5),
  );

  console.log("Coste: qué se gana al aplicar el techo");
  let sinTecho = 0;
  let conTecho = 0;
  for (const ancho of ANCHOS) {
    sinTecho += rejillaTiles(limites, ancho, ZOOM_RESOLUCION).tiles.length;
    conTecho += rejillaTiles(limites, ancho, techo).tiles.length;
  }
  verificar(
    `el techo recorta las peticiones de ${sinTecho} a ${conTecho} tiles en el barrido`,
    conTecho < sinTecho,
    { sinTecho, conTecho },
  );
} else {
  verificar("el techo no vino nulo para una ubicación que sí tiene cobertura", false, techo);
}

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
