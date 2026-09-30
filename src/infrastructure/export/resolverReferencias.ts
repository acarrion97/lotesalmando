import { supabase } from "@/infrastructure/supabase/client";
import { SEPARADOR_CLAVE, definicionTabla, normalizarClave } from "./exportTableCatalog";

/**
 * Índice de una tabla para referenciar sus registros sin usar el id:
 * cada clave (compuesta o individual) apunta al id del registro.
 *
 * Se carga una sola vez al empezar la importación y se refresca después de
 * insertar, para que las filas hijas encuentren a los padres creados en la
 * misma corrida.
 */
export interface MapaTabla {
  /** identificador normalizado -> id del registro */
  porClave: Map<string, number>;
  /** id -> clave natural compuesta (clave canónica del registro) */
  porId: Map<number, string>;
  /** claves compuestas de los registros existentes (para detectar duplicados) */
  compuestas: Set<string>;
  /** identificadores que corresponden a más de un registro */
  ambiguas: Set<string>;
}

export type MapasClaves = Map<string, MapaTabla>;

export type Resolucion = { id: number; clave: string } | { error: string };

function agregarClave(mapa: MapaTabla, clave: string, id: number): void {
  const normalizada = normalizarClave(clave);
  if (!normalizada) return;
  const existente = mapa.porClave.get(normalizada);
  if (existente === undefined) {
    mapa.porClave.set(normalizada, id);
    return;
  }
  if (existente !== id) mapa.ambiguas.add(normalizada);
}

/** Lee la tabla y (re)construye su índice de claves. */
async function cargarTabla(nombre: string, mapas: MapasClaves): Promise<void> {
  const def = definicionTabla(nombre);
  const pk = def?.pk ?? null;
  if (!def || !pk) return;

  const columnas = new Set<string>([pk, ...def.claves]);
  const { data, error } = await supabase.from(nombre).select([...columnas].join(","));
  if (error) {
    if (!def.tabla) {
      // Tabla fuera del catálogo (usuario): si no se puede leer, sólo se
      // podrá referenciar por id numérico.
      mapas.set(nombre, {
        porClave: new Map(),
        porId: new Map(),
        compuestas: new Set(),
        ambiguas: new Set(),
      });
      return;
    }
    throw new Error(`No se pudo leer ${nombre} para resolver referencias: ${error.message}`);
  }
  // El `select` se arma con nombres dinámicos: se tipa la fila a mano.
  const filas = (data ?? []) as unknown as Record<string, unknown>[];

  const tabla = def.tabla;

  /** Valor de una columna de la clave: para una FK, la clave del padre. */
  const claveDeColumna = (fila: Record<string, unknown>, key: string): string => {
    const bruto = fila[key];
    if (bruto === null || bruto === undefined || String(bruto).trim() === "") return "";
    const col = tabla?.columnas.find((c) => c.key === key);
    if (col?.fk) {
      const idPadre = Number(bruto);
      const clavePadre = Number.isFinite(idPadre)
        ? mapas.get(col.fk)?.porId.get(idPadre)
        : undefined;
      return clavePadre ?? String(bruto).trim();
    }
    return String(bruto).trim();
  };

  const mapa: MapaTabla = {
    porClave: new Map(),
    porId: new Map(),
    compuestas: new Set(),
    ambiguas: new Set(),
  };

  for (const fila of filas) {
    const id = Number(fila[pk]);
    if (!Number.isFinite(id)) continue;

    const partes = def.claves.map((key) => claveDeColumna(fila, key)).filter((p) => p !== "");
    const compuesta = partes.join(SEPARADOR_CLAVE);
    mapa.porId.set(id, compuesta);

    // La clave compuesta identifica sin ambigüedad; cada columna por separado
    // también sirve, siempre que no se repita (si se repite queda marcada).
    if (compuesta) {
      agregarClave(mapa, compuesta, id);
      const normalizada = normalizarClave(compuesta);
      if (normalizada) mapa.compuestas.add(normalizada);
    }
    def.claves.forEach((key) => {
      const valor = claveDeColumna(fila, key);
      if (valor) agregarClave(mapa, valor, id);
    });
  }

  mapas.set(nombre, mapa);
}

/**
 * Carga los índices de claves de las tablas indicadas (y de las que dependen
 * sus claves naturales, para poder componerlas).
 */
export async function cargarMapasClaves(nombres: string[]): Promise<MapasClaves> {
  const mapas: MapasClaves = new Map();
  const cargadas = new Set<string>();
  const enCurso = new Set<string>();

  const cargar = async (nombre: string): Promise<void> => {
    if (cargadas.has(nombre) || enCurso.has(nombre)) return;
    const def = definicionTabla(nombre);
    if (!def) {
      cargadas.add(nombre);
      return;
    }
    enCurso.add(nombre);
    const dependencias = new Set<string>();
    def.claves.forEach((key) => {
      const fk = def.tabla?.columnas.find((c) => c.key === key)?.fk;
      if (fk) dependencias.add(fk);
    });
    for (const dep of dependencias) await cargar(dep);
    await cargarTabla(nombre, mapas);
    enCurso.delete(nombre);
    cargadas.add(nombre);
  };

  for (const nombre of nombres) await cargar(nombre);
  return mapas;
}

/** Reconstruye el índice de una tabla (llamar después de insertar en ella). */
export async function refrescarMapa(mapas: MapasClaves, nombre: string): Promise<void> {
  if (!mapas.has(nombre)) return;
  await cargarTabla(nombre, mapas);
}

/**
 * Convierte el valor de una celda en el id del registro referenciado.
 * Acepta la clave compuesta ("Etapa 1" o "Las Palmas / Etapa 1"), cualquier
 * columna de la clave por separado y, como respaldo, el id numérico.
 */
export function resolverReferencia(mapas: MapasClaves, tabla: string, valor: unknown): Resolucion {
  const texto = valor === null || valor === undefined ? "" : String(valor).trim();
  if (!texto) return { error: "no informó ningún valor" };

  const mapa = mapas.get(tabla);
  if (!mapa) {
    // Tabla sin índice: sólo se puede referenciar por su id numérico.
    if (/^\d+$/.test(texto)) return { id: Number(texto), clave: texto };
    return { error: `no se puede resolver «${texto}» contra ${tabla}` };
  }

  const normalizada = normalizarClave(texto);
  if (mapa.ambiguas.has(normalizada)) {
    return {
      error: `«${texto}» identifica a más de un registro de ${tabla}: usá el id o la clave completa`,
    };
  }

  const id = mapa.porClave.get(normalizada);
  if (id !== undefined) return { id, clave: mapa.porId.get(id) ?? texto };

  // Respaldo: id numérico. Si no existe, la propia BD lo rechaza al insertar.
  if (/^\d+$/.test(texto)) {
    return { id: Number(texto), clave: mapa.porId.get(Number(texto)) ?? texto };
  }

  return { error: `no encontró un registro de ${tabla} con «${texto}»` };
}
