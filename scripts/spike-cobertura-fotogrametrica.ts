/**
 * Spike de cobertura de la capa fotogramétrica (tarea 9.1 del cambio
 * cesium-vista-3d-mapas). Se ejecuta con:
 *
 *   node scripts/spike-cobertura-fotogrametrica.ts
 *
 * Qué hace, de punta a punta:
 *
 *   1. Lee los mapas PUBLICADOS (slug no nulo) con ubicación GPS desde
 *      Supabase con la anon key — la misma puerta que usa la app.
 *   2. Sondea la cobertura REAL de Google Photorealistic 3D Tiles: resuelve
 *      el asset ion 2275207 (el mismo que usa `createGooglePhotorealistic3DTileset`)
 *      hasta el `root.json` de Google y baja el cuadtreo por containment
 *      (boundingVolume.box en ECEF) hasta el tile que contiene cada punto,
 *      registrando hasta qué nivel hay contenido.
 *   3. Reverse geocodifica cada punto (Nominatim) para saber qué hay ahí.
 *
 * Imprime un reporte cuyo resultado se registra en design.md → Open Questions.
 * NO es una prueba de regresión: consulta servicios externos (Supabase, Cesium
 * ion, Google Tiles, Nominatim), depende de la red y consume cuota ion.
 */
import { readFileSync } from "node:fs";

interface MapaPublicado {
  id_mapa: number;
  id_proyecto: number;
  slug: string;
  centro_lat: number | null;
  centro_lng: number | null;
  ancho_m: number | null;
}

interface TileCesium {
  boundingVolume?: { box?: number[] };
  content?: { uri?: string; url?: string };
  children?: TileCesium[];
}

interface TilesetCesium {
  root: TileCesium;
}

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/** Lee `.env` sin dependencias: `CLAVE=valor`, ignorando comentarios y espacios. */
function leerEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const linea of readFileSync(".env", "utf8").split("\n")) {
    const coincide = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linea);
    if (!coincide) continue;
    env[coincide[1]] = coincide[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

/** Lat/lng (grados) → ECEF (metros), para comparar contra los `box` de los tiles. */
function aEcef(lat: number, lng: number, altura = 0): [number, number, number] {
  const A = 6378137;
  const F = 1 / 298.257223563;
  const E2 = F * (2 - F);
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const sinLat = Math.sin(latR);
  const N = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  return [
    (N + altura) * Math.cos(latR) * Math.cos(lngR),
    (N + altura) * Math.cos(latR) * Math.sin(lngR),
    (N * (1 - E2) + altura) * sinLat,
  ];
}

/**
 * Distancia de violación del `box` (centro + 3 semiejes ortogonales) del tile:
 * el máximo, sobre los 3 ejes, de `|proyección| - semilargo`. Valores
 * negativos o cero significan que el punto está dentro. Se usa como medida
 * porque el punto puede caer justo en un límite entre tiles (las coordenadas
 * del proyecto tienen decimales y la conversión a ECEF no es exacta); con una
 * tolerancia de unos metros se sigue el hijo más cercano en vez de cortar.
 */
function violacionDeLaCaja(box: number[], punto: [number, number, number]): number {
  const [cx, cy, cz] = box;
  const ejes: [number, number, number][] = [
    [box[3], box[4], box[5]],
    [box[6], box[7], box[8]],
    [box[9], box[10], box[11]],
  ];
  const dx = punto[0] - cx;
  const dy = punto[1] - cy;
  const dz = punto[2] - cz;
  let maxima = -Infinity;
  for (const [ax, ay, az] of ejes) {
    const proyeccion = dx * ax + dy * ay + dz * az;
    const largo2 = ax * ax + ay * ay + az * az;
    maxima = Math.max(maxima, Math.abs(proyeccion) - largo2);
  }
  return maxima;
}

/**
 * Entre los hijos con caja válida, devuelve el que contiene el punto (o el más
 * cercano si la violación queda dentro de `toleranciaMetros`), o `null`.
 *
 * La tolerancia (50 m) solo se ejerce cuando el punto cae en un LÍMITE entre
 * tiles —pasa una sola vez, en el nivel 15, porque las coordenadas del
 * proyecto tienen decimales y la conversión a ECEF no es exacta—; más abajo el
 * punto queda estrictamente dentro del hijo correcto (violación ≤ 0), así que
 * la tolerancia no empuja a descender a tiles que no lo contienen.
 */
function hijoMasCercano(
  hijos: TileCesium[],
  punto: [number, number, number],
  toleranciaMetros = 50,
): TileCesium | null {
  let mejor: TileCesium | null = null;
  let mejorViolacion = Infinity;
  for (const hijo of hijos) {
    const box = hijo.boundingVolume?.box;
    if (!box) continue;
    const violacion = violacionDeLaCaja(box, punto);
    if (violacion < mejorViolacion) {
      mejorViolacion = violacion;
      mejor = hijo;
    }
  }
  return mejor !== null && mejorViolacion <= toleranciaMetros ? mejor : null;
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

const USUARIO_AGENTE = "lotes-al-mando-spike-cobertura/1.0";

/** Tilesets descargados, compartidos entre puntos (los ancestros se repiten). */
const cacheTilesets = new Map<string, Promise<TilesetCesium>>();

/**
 * Carga un tileset `.json`. La autenticación de Google Photorealistic es en
 * dos capas: la `key` del root y una `session` que embebida en algunas URIs y
 * que las URIs hijas heredan (las que vienen sin query esperan la sesión del
 * tileset padre que las sirvió). Se reconstruye la query uniendo la sesión
 * heredada (si la URI no trae una propia) y la key.
 */
async function cargarTileset(
  url: string,
  key: string,
  sesionHeredada: string,
): Promise<TilesetCesium> {
  const cacheLlave = `${url}|${sesionHeredada}`;
  const existente = cacheTilesets.get(cacheLlave);
  if (existente) return existente;
  const promesa = (async (): Promise<TilesetCesium> => {
    const objetivo = new URL(url);
    if (!objetivo.searchParams.has("session") && sesionHeredada) {
      objetivo.searchParams.set("session", sesionHeredada);
    }
    if (!objetivo.searchParams.has("key")) objetivo.searchParams.set("key", key);
    const respuesta = await fetch(objetivo.toString(), {
      headers: { "User-Agent": USUARIO_AGENTE },
    });
    if (!respuesta.ok) {
      throw new Error(`tileset ${respuesta.status}: ${objetivo.toString().slice(0, 120)}…`);
    }
    return (await respuesta.json()) as TilesetCesium;
  })();
  cacheTilesets.set(cacheLlave, promesa);
  return promesa;
}

/** La `session` que trae una URL, o la cadena vacía. */
function sesionDe(url: string): string {
  return new URL(url).searchParams.get("session") ?? "";
}

interface RecorridoCobertura {
  /** Último nivel del recorrido al que se llegó (por containment). */
  nivelLlegado: number;
  /** Nivel más profundo en el que el tile del camino tenía contenido. */
  nivelContenido: number;
  descargas: number;
}

/**
 * Baja el cuadtreo desde el tileset raíz hasta el tile que contiene el punto.
 * Un `content.uri` `.json` es un tileset externo que continúa el mismo nivel;
 * un `.glb` es malla (contenido real en ese nivel). La sesión se propaga en
 * descenso: las URIs sin query heredan la del tileset padre.
 */
async function caminarCobertura(
  urlRaiz: string,
  key: string,
  punto: [number, number, number],
  maxNiveles = 30,
  maxDescargas = 80,
): Promise<RecorridoCobertura> {
  let urlActual = urlRaiz;
  let sesion = sesionDe(urlRaiz);
  let tile = (await cargarTileset(urlActual, key, sesion)).root;
  let nivel = 0;
  let nivelContenido = -1;
  let descargas = 1;

  while (nivel <= maxNiveles) {
    // Contenido en este nivel: malla directa o tileset externo que continúa.
    const uri = tile.content?.uri ?? tile.content?.url;
    if (uri) {
      nivelContenido = nivel;
      if (/\.json(\?|$)/.test(uri)) {
        if (descargas >= maxDescargas) break;
        const absoluta = new URL(uri, urlActual).toString();
        // Hereda la sesión del tileset padre salvo que la URI traiga la suya.
        const sesionPropia = sesionDe(absoluta);
        const externo = await cargarTileset(absoluta, key, sesion);
        descargas++;
        sesion = sesionPropia || sesion;
        // La base para los contenidos relativos sigue siendo este tileset.
        urlActual = absoluta;
        // El tileset externo continúa el mismo nivel: su root es este tile.
        tile = externo.root;
        if (tile.content && !/\.json(\?|$)/.test(tile.content.uri ?? tile.content.url ?? "")) {
          // La malla del root externo también cuenta como contenido acá.
          nivelContenido = nivel;
        }
      }
    }

    const hijos = tile.children ?? [];
    const hijo = hijoMasCercano(hijos, punto);
    if (!hijo) break;
    tile = hijo;
    nivel++;
  }

  return { nivelLlegado: nivel, nivelContenido, descargas };
}

interface LugarReverso {
  display_name: string;
  tipo: string;
  asentamiento: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<LugarReverso | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const respuesta = await fetch(url, { headers: { "User-Agent": USUARIO_AGENTE } });
    if (!respuesta.ok) return null;
    const dato = (await respuesta.json()) as {
      display_name?: string;
      type?: string;
      address?: Record<string, string>;
    };
    const dir = dato.address ?? {};
    const asentamiento =
      dir.city ?? dir.town ?? dir.village ?? dir.hamlet ?? dir.municipality ?? dir.county ?? "";
    return {
      display_name: dato.display_name ?? "(sin nombre)",
      tipo: dato.type ?? "",
      asentamiento,
    };
  } catch {
    return null;
  }
}

/** Veredicto según el nivel más profundo con contenido en el camino. */
function veredictoDeCobertura(nivelContenido: number): string {
  if (nivelContenido >= 16) return "COMPLETA";
  if (nivelContenido >= 8) return "PARCIAL";
  return "SIN COBERTURA";
}

async function main(): Promise<void> {
  const env = leerEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const ionToken = env.CESIUM_TOKEN;

  console.log("Credenciales");
  verificar("VITE_SUPABASE_URL presente", !!supabaseUrl);
  verificar("VITE_SUPABASE_ANON_KEY presente", !!anonKey);
  verificar("CESIUM_TOKEN presente", !!ionToken);
  if (!supabaseUrl || !anonKey || !ionToken) process.exit(1);

  console.log("\nMapas publicados con ubicación GPS (Supabase, anon key)");
  const encabezados = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const respuestaMapas = await fetch(
    `${supabaseUrl}/rest/v1/mapas?select=id_mapa,id_proyecto,slug,centro_lat,centro_lng,ancho_m` +
      `&slug=not.is.null&centro_lat=not.is.null&centro_lng=not.is.null&order=id_mapa`,
    { headers: encabezados },
  );
  if (!respuestaMapas.ok) {
    console.error(
      `  FALLO consultar mapas: ${respuestaMapas.status} ${await respuestaMapas.text()}`,
    );
    process.exit(1);
  }
  const mapas = (await respuestaMapas.json()) as MapaPublicado[];
  verificar(`hay al menos un mapa publicado con GPS (${mapas.length})`, mapas.length > 0);
  if (mapas.length === 0) {
    console.log("  No hay mapas publicados: no hay nada que sondear.");
    process.exit(fallos > 0 ? 1 : 0);
  }

  const respuestaProyectos = await fetch(
    `${supabaseUrl}/rest/v1/proyectos?select=id_proyecto,nombre&order=id_proyecto`,
    { headers: encabezados },
  );
  const proyectos = respuestaProyectos.ok
    ? ((await respuestaProyectos.json()) as { id_proyecto: number; nombre: string }[])
    : [];
  const nombreDe = (id: number) => proyectos.find((p) => p.id_proyecto === id)?.nombre ?? `#${id}`;

  console.log("\nTileset fotográfico (ion asset 2275207 → Google root.json)");
  const respuestaEndpoint = await fetch(`https://api.cesium.com/v1/assets/2275207/endpoint`, {
    headers: { Authorization: `Bearer ${ionToken}` },
  });
  verificar(`endpoint ion responde (${respuestaEndpoint.status})`, respuestaEndpoint.ok);
  if (!respuestaEndpoint.ok) {
    console.error(`  ${await respuestaEndpoint.text()}`);
    process.exit(1);
  }
  const endpoint = (await respuestaEndpoint.json()) as { options?: { url?: string } };
  const urlRaiz = endpoint.options?.url;
  verificar("el endpoint trae el root.json de Google", !!urlRaiz);
  if (!urlRaiz) process.exit(1);
  const key = new URL(urlRaiz).searchParams.get("key") ?? "";
  verificar("el root.json trae la key de Google", !!key);

  const resultados: {
    mapa: MapaPublicado;
    lugar: LugarReverso | null;
    recorrido: RecorridoCobertura | null;
    error?: string;
  }[] = [];

  for (const mapa of mapas) {
    const lat = mapa.centro_lat as number;
    const lng = mapa.centro_lng as number;
    let recorrido: RecorridoCobertura | null = null;
    let error: string | undefined;
    try {
      recorrido = await caminarCobertura(urlRaiz, key, aEcef(lat, lng));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const lugar = await reverseGeocode(lat, lng);
    resultados.push({ mapa, lugar, recorrido, error });
    await esperar(1100); // cortesía con Nominatim (1 petición por segundo)
  }

  console.log("\nReporte por mapa publicado");
  for (const { mapa, lugar, recorrido, error } of resultados) {
    console.log(`\n  ${mapa.slug} — ${nombreDe(mapa.id_proyecto)}`);
    console.log(
      `    coordenadas: ${mapa.centro_lat}, ${mapa.centro_lng} · ancho ${mapa.ancho_m} m`,
    );
    console.log(
      `    lugar: ${lugar ? `${lugar.asentamiento || "?"} (${lugar.tipo}) — ${lugar.display_name}` : "(reverse geocode no disponible)"}`,
    );
    if (error) {
      console.log(`    cobertura: ERROR de sondeo — ${error}`);
    } else if (recorrido) {
      console.log(
        `    cobertura: nivel con contenido = ${recorrido.nivelContenido} · recorrido hasta nivel ${recorrido.nivelLlegado} · ${recorrido.descargas} descarga(s)`,
      );
      console.log(`    veredicto: ${veredictoDeCobertura(recorrido.nivelContenido)}`);
    }
  }

  const veredictos = resultados.map((r) =>
    r.recorrido ? veredictoDeCobertura(r.recorrido.nivelContenido) : "ERROR",
  );
  const completas = veredictos.filter((v) => v === "COMPLETA").length;
  const parciales = veredictos.filter((v) => v === "PARCIAL").length;
  const sinCobertura = veredictos.filter((v) => v === "SIN COBERTURA").length;
  const errores = veredictos.filter((v) => v === "ERROR").length;

  console.log("\nResumen");
  console.log(
    `  ${completas} COMPLETA · ${parciales} PARCIAL · ${sinCobertura} SIN COBERTURA · ${errores} ERROR`,
  );
  verificar("todo punto tuvo veredicto (sin errores de sondeo)", errores === 0);

  if (fallos > 0) {
    console.error(`\n${fallos} verificación(es) fallida(s)`);
    process.exit(1);
  }
  console.log("\nSpike terminado: registrar el resultado en design.md → Open Questions.");
}

await main();
