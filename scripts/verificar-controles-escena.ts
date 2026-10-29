/**
 * Verificación de los controles de escena y del proveedor de refresco
 * (tareas 5.1 a 5.4 del cambio cesium-vista-3d-mapas). Se ejecuta con:
 *
 *   node scripts/verificar-controles-escena.ts
 *
 * Prueba el núcleo puro de `controlesEscena.ts` y `refresco.ts`: no se
 * renderiza nada y no se toca Cesium (el único contacto con el motor es un
 * objeto simulado que recibe el nivel de nitidez). Justo eso es lo que
 * permite correr la verificación en Node.
 */
import {
  CALIDAD_INICIAL,
  RANGO_ERROR_PANTALLA,
  RANGO_ESCALA_RESOLUCION,
  RANGO_HORA,
  aplicarErrorPantalla,
  clampRango,
  fechaParaHora,
  horaATexto,
  horaInicial,
} from "../src/presentation/components/maps/cesium/controlesEscena.ts";
import {
  INTERVALO_REFRESCO_MS,
  crearProveedorRefresco,
  productorPorIntervalo,
  type ProductorRefresco,
} from "../src/presentation/components/maps/cesium/refresco.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

console.log("Rangos de los controles");
verificar(
  "hora: paso de media hora y tope en 23:30",
  RANGO_HORA.paso === 0.5 && RANGO_HORA.max === 23.5,
);
verificar(
  "nitidez: 4–32 con default 16 (design.md D8)",
  RANGO_ERROR_PANTALLA.min === 4 &&
    RANGO_ERROR_PANTALLA.max === 32 &&
    RANGO_ERROR_PANTALLA.inicial === 16,
);
verificar(
  "escala de resolución: 0,5–1,5",
  RANGO_ESCALA_RESOLUCION.min === 0.5 && RANGO_ESCALA_RESOLUCION.max === 1.5,
);
verificar(
  "la calidad inicial coincide con los defaults de Cesium",
  CALIDAD_INICIAL.errorPantalla === 16 &&
    CALIDAD_INICIAL.escalaResolucion === 1 &&
    CALIDAD_INICIAL.fxaa &&
    CALIDAD_INICIAL.hdr,
);
verificar(
  "clamp acota a los extremos y devuelve el inicial ante NaN",
  clampRango(100, RANGO_ERROR_PANTALLA) === 32 &&
    clampRango(1, RANGO_ERROR_PANTALLA) === 4 &&
    clampRango(20, RANGO_ERROR_PANTALLA) === 20 &&
    clampRango(NaN, RANGO_ERROR_PANTALLA) === 16,
);

console.log("Hora del día");
verificar(
  "horaATexto formatea y acota",
  horaATexto(0) === "00:00" &&
    horaATexto(8.5) === "08:30" &&
    horaATexto(23.5) === "23:30" &&
    horaATexto(30) === "23:30",
);
const BASE = new Date(2026, 9, 29, 10, 0, 0); // 29 de octubre de 2026, hora local
const TARDE = fechaParaHora(13.5, BASE);
verificar(
  "fechaParaHora devuelve hoy a la hora local pedida",
  TARDE.getFullYear() === 2026 &&
    TARDE.getMonth() === 9 &&
    TARDE.getDate() === 29 &&
    TARDE.getHours() === 13 &&
    TARDE.getMinutes() === 30,
  TARDE,
);
const ACOTADA = fechaParaHora(30, BASE);
verificar(
  "una hora fuera de rango se acota, no se desborda",
  ACOTADA.getHours() === 23 && ACOTADA.getMinutes() === 30,
);
const EN_RANGO = horaInicial(new Date(2026, 9, 29, 14, 20, 0));
verificar(
  "horaInicial redondea la hora actual al paso y queda en rango",
  EN_RANGO === 14.5 && EN_RANGO >= RANGO_HORA.min && EN_RANGO <= RANGO_HORA.max,
  EN_RANGO,
);

console.log("Aplicación del nivel de nitidez a un tileset");
const tilesetSimulado = { maximumScreenSpaceError: 16 } as unknown as Parameters<
  typeof aplicarErrorPantalla
>[0];
aplicarErrorPantalla(tilesetSimulado, 8);
verificar("el tileset recibe el valor elegido", tilesetSimulado.maximumScreenSpaceError === 8);
aplicarErrorPantalla(tilesetSimulado, 999);
verificar("y siempre dentro del rango acotado", tilesetSimulado.maximumScreenSpaceError === 32);
let falloAlAplicar = false;
try {
  aplicarErrorPantalla(null, 8);
} catch {
  falloAlAplicar = true;
}
verificar("un tileset ausente no es un error", !falloAlAplicar);

console.log("Proveedor de refresco (productor intercambiable)");
let productorIniciado = 0;
let productorRetirado = 0;
let tick: (() => void) | null = null;
const productorManual: ProductorRefresco = (onRefresco) => {
  productorIniciado++;
  tick = onRefresco;
  return () => {
    productorRetirado++;
    tick = null;
  };
};
const proveedor = crearProveedorRefresco(productorManual);
verificar("sin suscriptores no se arranca el productor", productorIniciado === 0);

let avisosA = 0;
let avisosB = 0;
const bajaA = proveedor.subscribe(() => {
  avisosA++;
});
const bajaB = proveedor.subscribe(() => {
  avisosB++;
});
verificar("el productor arranca con el primer suscriptor", productorIniciado === 1);

tick?.();
verificar("un tick avisa a todos los suscriptores", avisosA === 1 && avisosB === 1, {
  avisosA,
  avisosB,
});

bajaA();
tick?.();
verificar("la baja de un suscriptor lo saca del reparto", avisosA === 1 && avisosB === 2, {
  avisosA,
  avisosB,
});
verificar("el productor sigue vivo con un suscriptor restante", productorRetirado === 0);

bajaB();
verificar("con el último suscriptor se retira el productor", productorRetirado === 1);
tick?.();
verificar("sin productor no hay ticks que notificar", avisosA === 1 && avisosB === 2);

const bajaResuscitada = proveedor.subscribe(() => {
  avisosA++;
});
verificar("re-suscribir reinicia el productor", productorIniciado === 2);
bajaResuscitada();

proveedor.dispose();
verificar("dispose retira el productor", productorRetirado === 2);
let avisosTrasDispose = 0;
const bajaTrasDispose = proveedor.subscribe(() => {
  avisosTrasDispose++;
});
tick?.();
bajaTrasDispose();
verificar(
  "tras dispose el proveedor queda inerte (suscripción y notificación)",
  productorIniciado === 2 && avisosTrasDispose === 0,
);

console.log("Productor por intervalo (el de hoy)");
const INTERVALO_PRUEBA_MS = 20;
const proveedorReloj = crearProveedorRefresco(productorPorIntervalo(INTERVALO_PRUEBA_MS));
let ticks = 0;
const bajaReloj = proveedorReloj.subscribe(() => {
  ticks++;
});
await new Promise((resolver) => setTimeout(resolver, 110));
verificar("el intervalo produce ticks", ticks >= 2, ticks);
bajaReloj();
const ticksAlParar = ticks;
await new Promise((resolver) => setTimeout(resolver, 60));
verificar("la baja detiene los ticks", ticks === ticksAlParar, { ticks, ticksAlParar });
proveedorReloj.dispose();

verificar(
  "el intervalo por defecto es el de un minuto documentado",
  INTERVALO_REFRESCO_MS === 60_000,
);

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
