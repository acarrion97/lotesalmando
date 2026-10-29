/**
 * Verificación de la disponibilidad del modo 3D (tarea 2.4 del cambio
 * cesium-vista-3d-mapas). Se ejecuta con:
 *
 *   node scripts/verificar-disponibilidad-cesium.ts
 *
 * Prueba el núcleo puro inyectando los hechos: no se renderiza nada, no hay
 * canvas y no se lee `document`. Justo eso es lo que permite correr la
 * verificación en Node, y se comprueba además al final.
 */
import {
  capacidadesGraficas,
  disponibilidadDeLaEscena,
  soportaEscena3D,
  tokenConfigurado,
} from "../src/presentation/components/maps/cesium/disponibilidad.ts";

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

const CON_WEBGL2 = { webgl2: true, instanciasEnWebGl1: false };
const CON_WEBGL1_E_INSTANCIAS = { webgl2: false, instanciasEnWebGl1: true };
const SIN_SOPORTE = { webgl2: false, instanciasEnWebGl1: false };
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ejemplo";

console.log("Token");
verificar("token vacío no cuenta", !tokenConfigurado(""));
verificar("token de solo espacios no cuenta", !tokenConfigurado("   "));
verificar("null no cuenta", !tokenConfigurado(null));
verificar("undefined no cuenta", !tokenConfigurado(undefined));
verificar("un token real cuenta", tokenConfigurado(TOKEN));

console.log("Soporte gráfico");
verificar("WebGL2 basta", soportaEscena3D(CON_WEBGL2));
verificar("WebGL1 con instancias basta", soportaEscena3D(CON_WEBGL1_E_INSTANCIAS));
verificar("sin WebGL2 ni instancias no basta", !soportaEscena3D(SIN_SOPORTE));

console.log("Disponibilidad");
const todoBien = disponibilidadDeLaEscena({ token: TOKEN, graficas: CON_WEBGL2, enLinea: true });
verificar(
  "token + WebGL2 + en línea = disponible",
  todoBien.disponible && todoBien.motivo === null,
  todoBien,
);
verificar(
  "WebGL1 con instancias también sirve",
  disponibilidadDeLaEscena({ token: TOKEN, graficas: CON_WEBGL1_E_INSTANCIAS, enLinea: true })
    .disponible,
);
verificar(
  "con WebGL2 no hace falta que haya instancias en WebGL1",
  disponibilidadDeLaEscena({
    token: TOKEN,
    graficas: { webgl2: true, instanciasEnWebGl1: false },
    enLinea: false,
  }).motivo === "sin-conexion",
);

console.log("Motivos");
const sinToken = disponibilidadDeLaEscena({ token: "", graficas: CON_WEBGL2, enLinea: true });
verificar(
  "sin token -> sin-token",
  !sinToken.disponible && sinToken.motivo === "sin-token",
  sinToken,
);
const sinWebgl = disponibilidadDeLaEscena({ token: TOKEN, graficas: SIN_SOPORTE, enLinea: true });
verificar(
  "sin soporte gráfico -> sin-webgl",
  !sinWebgl.disponible && sinWebgl.motivo === "sin-webgl",
  sinWebgl,
);
const sinConexion = disponibilidadDeLaEscena({
  token: TOKEN,
  graficas: CON_WEBGL2,
  enLinea: false,
});
verificar(
  "sin conexión -> sin-conexion",
  !sinConexion.disponible && sinConexion.motivo === "sin-conexion",
  sinConexion,
);

console.log("Precedencia: manda la causa más estable");
verificar(
  "sin token y sin webgl manda sin-token",
  disponibilidadDeLaEscena({ token: " ", graficas: SIN_SOPORTE, enLinea: false }).motivo ===
    "sin-token",
);
verificar(
  "con token, sin webgl y sin conexión manda sin-webgl",
  disponibilidadDeLaEscena({ token: TOKEN, graficas: SIN_SOPORTE, enLinea: false }).motivo ===
    "sin-webgl",
);

console.log("El módulo no exige navegador");
const primera = capacidadesGraficas();
const segunda = capacidadesGraficas();
verificar("sin `document` devuelve que no hay soporte", !soportaEscena3D(primera), primera);
verificar("el resultado se cachea por sesión", Object.is(primera, segunda));

if (fallos > 0) {
  console.error(`\n${fallos} verificación(es) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las verificaciones pasaron");
