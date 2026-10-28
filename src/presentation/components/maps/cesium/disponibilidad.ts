/**
 * Disponibilidad del modo 3D real. Todo lo que se puede saber sin montar la
 * escena, y sin tocar Cesium: si hay token, si el navegador da el WebGL que
 * Cesium necesita, y si hay conexión.
 *
 * El núcleo es puro (acepta los hechos y devuelve la respuesta), así que se
 * prueba en Node sin renderizar. La medición del navegador vive aparte y se
 * cachea por sesión: crear un contexto WebGL tiene coste y acumularlos vacía
 * la cuota de contextos del navegador.
 */

/** Por qué el modo no puede abrirse. */
export type MotivoNoDisponible = "sin-token" | "sin-webgl" | "sin-conexion";

export interface DisponibilidadEscena {
  /** Cuando es `false`, `motivo` explica el primer requisito que falta. */
  disponible: boolean;
  motivo: MotivoNoDisponible | null;
}

/**
 * Lo que el navegador ofrece en gráficos. Se mide fuera del núcleo para poder
 * inyectar los hechos en la verificación.
 */
export interface CapacidadesGraficas {
  /** WebGL2: el camino que Cesium 1.146 prefiere. */
  webgl2: boolean;
  /**
   * Respaldo WebGL1. Cesium exige `ANGLE_instanced_arrays` para los billboards
   * y las etiquetas; sin ella la escena se queda muda aunque el resto
   * renderice. Solo se consulta cuando no hay WebGL2.
   */
  instanciasEnWebGl1: boolean;
}

/** Cesium puede montar la escena con WebGL2 o, en su defecto, WebGL1 con instancias. */
export function soportaEscena3D({ webgl2, instanciasEnWebGl1 }: CapacidadesGraficas): boolean {
  return webgl2 || instanciasEnWebGl1;
}

/** Un token vacío o de solo espacios cuenta como no configurado. */
export function tokenConfigurado(token: string | null | undefined): boolean {
  return typeof token === "string" && token.trim().length > 0;
}

interface EntradaDisponibilidad {
  token: string | null | undefined;
  graficas: CapacidadesGraficas;
  enLinea: boolean;
}

/**
 * Resuelve la disponibilidad de la escena. El orden de los motivos es el de
 * determinismo: primero lo que es un hecho del despliegue (el token), después
 * lo que es un hecho del equipo (el WebGL) y al final lo que cambia cada
 * minuto (la conexión). Con eso, el mensaje que ve el usuario apunta siempre
 * a la causa más estable y no a un síntoma transitorio.
 */
export function disponibilidadDeLaEscena({
  token,
  graficas,
  enLinea,
}: EntradaDisponibilidad): DisponibilidadEscena {
  if (!tokenConfigurado(token)) return { disponible: false, motivo: "sin-token" };
  if (!soportaEscena3D(graficas)) return { disponible: false, motivo: "sin-webgl" };
  if (!enLinea) return { disponible: false, motivo: "sin-conexion" };
  return { disponible: true, motivo: null };
}

const SIN_GRAFICAS: CapacidadesGraficas = { webgl2: false, instanciasEnWebGl1: false };

let graficasCache: CapacidadesGraficas | null = null;

/** Contexto gráfico del navegador, medida una vez por sesión. */
export function capacidadesGraficas(): CapacidadesGraficas {
  graficasCache ??= medirGraficas();
  return graficasCache;
}

function medirGraficas(): CapacidadesGraficas {
  if (typeof document === "undefined") return SIN_GRAFICAS;

  const canvas = document.createElement("canvas");
  if (canvas.getContext("webgl2")) {
    // `instanciasEnWebGl1` queda en `false` a propósito: solo se consulta como
    // respaldo cuando WebGL2 falta, y aquí ya no falta.
    return { webgl2: true, instanciasEnWebGl1: false };
  }

  const contexto =
    (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

  return {
    webgl2: false,
    instanciasEnWebGl1: contexto?.getExtension("ANGLE_instanced_arrays") != null,
  };
}
