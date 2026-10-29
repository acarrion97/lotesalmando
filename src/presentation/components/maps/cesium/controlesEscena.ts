/**
 * Reglas puras de los controles de escena: la hora del día que mueve el sol
 * (tarea 5.1) y los rangos de calidad (tarea 5.2) del cambio
 * cesium-vista-3d-mapas. Sin Cesium en runtime ni DOM: se verifican en Node
 * con `node scripts/verificar-controles-escena.ts`.
 */
import type { Cesium3DTileset } from "cesium";

/** Un slider del panel de controles: rango acotado, paso e inicial. */
export interface RangoControl {
  min: number;
  max: number;
  paso: number;
  inicial: number;
}

/** Hora del día: media hora de paso, de 00:00 a 23:30. */
export const RANGO_HORA: RangoControl = { min: 0, max: 23.5, paso: 0.5, inicial: 12 };

/**
 * `tileset.maximumScreenSpaceError` (design.md D8): 4 pide ~8× más tiles que
 * 32, así que el rango se acota para que "más nítido" no dispare la cuota ion
 * sin control. El default 16 es el que Cesium recomienda.
 */
export const RANGO_ERROR_PANTALLA: RangoControl = { min: 4, max: 32, paso: 1, inicial: 16 };

/** `viewer.resolutionScale`: por debajo de 1 renderiza a menor resolución interna. */
export const RANGO_ESCALA_RESOLUCION: RangoControl = { min: 0.5, max: 1.5, paso: 0.05, inicial: 1 };

/** Estado de los controles de calidad de la escena. */
export interface CalidadEscena {
  /** `tileset.maximumScreenSpaceError`: menor = más nítido, más tiles. */
  errorPantalla: number;
  /** `viewer.resolutionScale`: mayor = más nítido, más píxeles por frame. */
  escalaResolucion: number;
  /** Antialiasing por post-proceso. */
  fxaa: boolean;
  /** Alto rango dinámico de la escena. */
  hdr: boolean;
}

/** La escena nace con la calidad que Cesium ya trae por defecto. */
export const CALIDAD_INICIAL: CalidadEscena = {
  errorPantalla: RANGO_ERROR_PANTALLA.inicial,
  escalaResolucion: RANGO_ESCALA_RESOLUCION.inicial,
  fxaa: true,
  hdr: true,
};

/** Acota un valor al rango del control; el paso lo garantiza el slider. */
export function clampRango(valor: number, rango: RangoControl): number {
  if (Number.isNaN(valor)) return rango.inicial;
  return Math.min(rango.max, Math.max(rango.min, valor));
}

/**
 * Fecha de hoy (o del día de `ahora`) a la hora local pedida. Va como `Date`
 * porque `JulianDate.fromDate` ya se encarga de pasar al instante UTC que
 * Cesium usa para calcular la posición del sol.
 */
export function fechaParaHora(hora: number, ahora: Date = new Date()): Date {
  const horaAcotada = clampRango(hora, RANGO_HORA);
  const entera = Math.floor(horaAcotada);
  const minutos = Math.round((horaAcotada - entera) * 60);
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), entera, minutos, 0, 0);
}

/** Hora del día como "13:30". */
export function horaATexto(hora: number): string {
  const horaAcotada = clampRango(hora, RANGO_HORA);
  const entera = Math.floor(horaAcotada);
  const minutos = Math.round((horaAcotada - entera) * 60);
  return `${String(entera).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/** La hora actual redondeada al paso del slider: la escena abre con la luz de ahora. */
export function horaInicial(ahora: Date = new Date()): number {
  const exacta = ahora.getHours() + ahora.getMinutes() / 60;
  const paso = RANGO_HORA.paso;
  return clampRango(Math.round(exacta / paso) * paso, RANGO_HORA);
}

/**
 * Pone un tileset al nivel de nitidez elegido. Los tilesets se crean tarde
 * (OSM Buildings y la malla fotográfica cargan bajo demanda), así que el
 * valor se vuelve a aplicar en cada alta: el control de calidad no puede
 * depender de cuándo llegó el primitive.
 */
export function aplicarErrorPantalla(
  tileset: Cesium3DTileset | null | undefined,
  errorPantalla: number,
): void {
  if (tileset) tileset.maximumScreenSpaceError = clampRango(errorPantalla, RANGO_ERROR_PANTALLA);
}
