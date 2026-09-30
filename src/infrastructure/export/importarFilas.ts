import { supabase } from "@/infrastructure/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  SEPARADOR_CLAVE,
  definicionTabla,
  getTablaExport,
  normalizarClave,
  ordenarPorDependencia,
  tablasReferenciadas,
} from "./exportTableCatalog";
import type { ColumnaExport, TablaExport } from "./exportTableCatalog";
import type { ColumnaArchivo, FilaCruda } from "./leerArchivoImportacion";
import { cargarMapasClaves, refrescarMapa, resolverReferencia } from "./resolverReferencias";
import type { MapasClaves } from "./resolverReferencias";

/** Fila del archivo ya normalizada y validada contra la tabla destino. */
export interface FilaImportacion {
  /** Número de fila de datos en el archivo (1 = primera fila bajo la cabecera). */
  numero: number;
  /** Valores listos para `insert` (columna BD -> valor). */
  valores: Record<string, unknown>;
  /** Extracto de la fila para reconocerla en la tabla de resultados. */
  resumen: string;
  errores: string[];
  /** Clave natural propia de la tabla (si la tiene) una vez resueltas las FK. */
  clave?: string;
}

export interface ResultadoFila {
  numero: number;
  resumen: string;
  /** `existente` = el registro ya estaba en la base con esa clave: se omite. */
  estado: "ok" | "existente" | "error";
  mensaje: string;
}

/** Datos de una tabla dentro del archivo (una hoja o un grupo de filas). */
export interface BloqueImportacion {
  tabla: string;
  /** Hoja de origen, para el reporte. */
  hoja: string;
  columnas: ColumnaArchivo[];
  filas: FilaCruda[];
}

/** Resultado de importar una tabla completa. */
export interface ResultadoTabla {
  tabla: string;
  hoja: string;
  filas: number;
  insertadas: number;
  existentes: number;
  errores: number;
  resultados: ResultadoFila[];
}

export type ProgresoImportacion = (procesadas: number, total: number) => void;

/** Filas por petición; si un lote falla se reintenta fila por fila para aislmar el error. */
const TAMANO_LOTE = 100;

/**
 * Claves de react-query a refrescar después de importar en cada tabla, para que
 * las pantallas afectadas vuelvan a leer de Supabase.
 */
export const CLAVES_INVALIDAR: Record<string, string[]> = {
  proyectos: ["proyectos", "etapas", "manzanas", "lotes"],
  etapas: ["etapas", "manzanas", "lotes"],
  manzana_bloque: ["manzanas", "lotes"],
  lotes: ["lotes", "inventario", "mapa"],
  cliente: ["clientes", "cotizaciones"],
  prospectos: ["prospectos", "oportunidades", "actividades"],
  asesores: ["asesores", "prospectos"],
  cotizador: ["cotizaciones", "clientes", "lotes"],
  ventas: ["ventas", "lotes", "contratos", "cobranzas"],
  contratos: ["contratos", "cobranzas"],
  cobranzas: ["cobranzas", "pagos", "carteraMetricas"],
  pagos: ["pagos", "cobranzas", "carteraMetricas"],
  inventario: ["inventario", "lotes"],
  oportunidades: ["oportunidades", "prospectos", "lotes"],
  actividades: ["actividades", "prospectos"],
};

function normalizarNumero(bruto: unknown): number | null {
  if (typeof bruto === "number") return Number.isFinite(bruto) ? bruto : null;
  if (typeof bruto === "boolean") return bruto ? 1 : 0;
  if (typeof bruto !== "string") return null;

  let texto = bruto.trim().replace(/[^\d.,-]/g, "");
  if (!texto) return null;

  const puntos = (texto.match(/\./g) ?? []).length;
  const comas = (texto.match(/,/g) ?? []).length;

  if (puntos > 0 && comas > 0) {
    // 1.234,56 (es) vs 1,234.56 (en): gana el que aparece último.
    texto =
      texto.lastIndexOf(",") > texto.lastIndexOf(".")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto.replace(/,/g, "");
  } else if (comas > 1) {
    texto = texto.replace(/,/g, ""); // 1,234,567 -> miles
  } else if (comas === 1) {
    texto = texto.replace(",", "."); // coma decimal
  } else if (puntos > 1) {
    texto = texto.replace(/\./g, ""); // 1.234.567 -> miles
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

function conDosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

function normalizarFecha(bruto: unknown): string | null {
  if (bruto instanceof Date) {
    return Number.isNaN(bruto.getTime()) ? null : bruto.toISOString().slice(0, 10);
  }

  if (typeof bruto === "number") {
    // Fecha serial de Excel (días desde el 30/12/1899).
    if (bruto <= 0) return null;
    const fecha = new Date(Math.round((bruto - 25569) * 86400000));
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
  }

  if (typeof bruto !== "string") return null;

  const texto = bruto.trim();
  if (!texto) return null;

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${conDosDigitos(Number(iso[2]))}-${conDosDigitos(Number(iso[3]))}`;

  const corta = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (corta) {
    // Asume día/mes/año (formato local); si el primero es > 12 no hay duda.
    const dia = Number(corta[1]);
    const mes = Number(corta[2]);
    const anio = Number(corta[3].length === 2 ? `20${corta[3]}` : corta[3]);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return `${anio}-${conDosDigitos(mes)}-${conDosDigitos(dia)}`;
    }
  }

  const parseada = Date.parse(texto);
  if (!Number.isNaN(parseada)) return new Date(parseada).toISOString().slice(0, 10);

  return null;
}

function normalizarValor(meta: ColumnaExport, bruto: unknown): { valor: unknown; error?: string } {
  if (bruto === null || bruto === undefined) return { valor: null };
  if (typeof bruto === "string" && bruto.trim() === "") return { valor: null };

  // Las claves foráneas vienen como código o nombre: se resuelven contra la
  // base después (aceptan también el id numérico, que sólo debe ser de respaldo).
  if (meta.fk) return { valor: String(bruto).trim() };

  if (meta.tipo === "entero" || meta.tipo === "numero" || meta.tipo === "moneda") {
    const numero = normalizarNumero(bruto);
    if (numero === null) {
      return { valor: null, error: `se esperaba un número (llegó “${String(bruto)}”)` };
    }
    if (meta.tipo === "entero" && !Number.isInteger(numero)) {
      return { valor: null, error: `se esperaba un número entero (llegó “${String(bruto)}”)` };
    }
    return { valor: numero };
  }

  if (meta.tipo === "fecha") {
    const fecha = normalizarFecha(bruto);
    if (!fecha) {
      return {
        valor: null,
        error: `fecha inválida, usá AAAA-MM-DD (llegó “${String(bruto)}”)`,
      };
    }
    return { valor: fecha };
  }

  return { valor: String(bruto).trim() };
}

/**
 * Convierte las filas crudas del archivo en filas listas para insertar:
 * aplica el mapeo de columnas, normaliza tipos, marca errores y agrega el
 * id de la empresa actual cuando la tabla lo requiere.
 */
export function prepararFilas(
  tabla: TablaExport,
  columnas: ColumnaArchivo[],
  filasCrudas: unknown[][],
  empresaId: number | null,
): FilaImportacion[] {
  const mapeadas = columnas.filter((col) => col.columnaDestino !== null);
  const deEmpresa = tabla.columnas.filter((col) => col.empresaActual);

  return filasCrudas.map((cruda, indice) => {
    const errores: string[] = [];
    const valores: Record<string, unknown> = {};
    const partes: string[] = [];

    mapeadas.forEach((col) => {
      const meta = tabla.columnas.find((c) => c.key === col.columnaDestino);
      if (!meta) return;

      const { valor, error } = normalizarValor(meta, cruda[col.indice]);
      if (error) {
        errores.push(`${meta.key} ${error}`);
        return;
      }
      if (valor === null) {
        if (meta.requerida) errores.push(`${meta.key}: es obligatorio`);
        return;
      }
      valores[meta.key] = valor;
      partes.push(String(valor));
    });

    deEmpresa.forEach((meta) => {
      if (empresaId) {
        valores[meta.key] = empresaId;
      } else {
        errores.push(`${meta.key}: no hay una empresa seleccionada`);
      }
    });

    if (errores.length === 0 && Object.keys(valores).length === 0) {
      errores.push("La fila no tiene ningún valor para importar");
    }

    return {
      numero: indice + 1,
      valores,
      resumen: partes.slice(0, 3).join(" · "),
      errores,
    };
  });
}

function traducirError(error: PostgrestError): string {
  const mensaje = error.message || "Error desconocido";

  if (error.code === "23505") return `Registro duplicado: ${mensaje}`;
  if (error.code === "23503") return `Referencia inexistente (revisá los id/códigos): ${mensaje}`;
  if (error.code === "23502") return `Falta un valor obligatorio: ${mensaje}`;
  if (error.code === "23514") return `Valor fuera de lo permitido por una restricción: ${mensaje}`;
  if (error.code === "22P02")
    return `Valor con formato inválido para el tipo de columna: ${mensaje}`;
  if (/permission denied|row-level security|not authorized/i.test(mensaje)) {
    return `Sin permisos para escribir en esta tabla (RLS): ${mensaje}`;
  }
  if (/failed to fetch|network/i.test(mensaje)) return "Sin conexión con Supabase";
  return mensaje;
}

/**
 * Inserta las filas válidas en lotes; si un lote falla se reintenta fila por
 * fila para reportar exactamente cuál dio error.
 */
export async function insertarFilas(
  tabla: string,
  filas: FilaImportacion[],
  onProgreso: ProgresoImportacion = () => {},
): Promise<ResultadoFila[]> {
  const resultados: ResultadoFila[] = [];

  for (let inicio = 0; inicio < filas.length; inicio += TAMANO_LOTE) {
    const lote = filas.slice(inicio, inicio + TAMANO_LOTE);
    const { error } = await supabase.from(tabla).insert(lote.map((fila) => fila.valores));

    if (!error) {
      lote.forEach((fila) =>
        resultados.push({
          numero: fila.numero,
          resumen: fila.resumen,
          estado: "ok",
          mensaje: "Insertada",
        }),
      );
    } else {
      for (const fila of lote) {
        const { error: errorFila } = await supabase.from(tabla).insert(fila.valores);
        resultados.push({
          numero: fila.numero,
          resumen: fila.resumen,
          estado: errorFila ? "error" : "ok",
          mensaje: errorFila ? traducirError(errorFila) : "Insertada",
        });
      }
    }

    onProgreso(Math.min(inicio + TAMANO_LOTE, filas.length), filas.length);
  }

  resultados.sort((a, b) => a.numero - b.numero);
  return resultados;
}

/**
 * Prepara un bloque del archivo (una hoja o un grupo de filas de una tabla):
 * aplica el mapeo, normaliza tipos y conserva el número de fila original del
 * archivo para poder señalarlo en el reporte.
 */
export function prepararBloque(
  tabla: TablaExport,
  bloque: BloqueImportacion,
  empresaId: number | null,
): FilaImportacion[] {
  const preparadas = prepararFilas(
    tabla,
    bloque.columnas,
    bloque.filas.map((fila) => fila.celdas),
    empresaId,
  );
  preparadas.forEach((fila, indice) => {
    fila.numero = bloque.filas[indice]?.numero ?? fila.numero;
  });
  return preparadas;
}

/**
 * Clave natural de una fila: une las columnas de la clave de la tabla; cuando
 * la columna es foránea se usa la clave del registro padre ya resuelta.
 */
export function componerClave(
  tabla: TablaExport,
  valores: Record<string, unknown>,
  clavesPadres: Record<string, string>,
): string {
  const partes = (tabla.claveNatural ?? []).map((key) => {
    const col = tabla.columnas.find((c) => c.key === key);
    const valor = col?.fk ? clavesPadres[key] : valores[key];
    if (valor === null || valor === undefined) return "";
    return String(valor).trim();
  });
  return partes.filter((p) => p !== "").join(SEPARADOR_CLAVE);
}

/**
 * Importa todas las tablas del archivo de una sola pasada:
 *
 * 1. las ordena de padre a hijo (proyectos -> etapas -> manzanas -> lotes...);
 * 2. resuelve cada clave foránea por la clave natural del registro (código o
 *    nombre), con el id numérico como respaldo;
 * 3. omite las filas cuya clave ya existe en la base ("ya existía");
 * 4. inserta y refresca el índice para que las tablas hijas encuentren las
 *    filas recién creadas (inserción masiva entre hojas).
 */
export async function importarBloques(
  bloques: BloqueImportacion[],
  empresaId: number | null,
  onProgreso: ProgresoImportacion = () => {},
): Promise<ResultadoTabla[]> {
  // Une los bloques que apuntan a la misma tabla (una hoja por tabla, o
  // varios grupos de filas).
  const porTabla = new Map<string, BloqueImportacion>();
  for (const bloque of bloques) {
    const previo = porTabla.get(bloque.tabla);
    if (!previo) {
      porTabla.set(bloque.tabla, { ...bloque, filas: [...bloque.filas] });
      continue;
    }
    previo.filas.push(...bloque.filas);
    if (!previo.hoja.includes(bloque.hoja)) previo.hoja = `${previo.hoja} · ${bloque.hoja}`;
  }

  const tablas = ordenarPorDependencia([...porTabla.keys()]);
  const necesarias = [...new Set([...tablas, ...tablasReferenciadas(tablas)])].filter(
    (nombre) => definicionTabla(nombre) !== null,
  );
  const mapas: MapasClaves = await cargarMapasClaves(necesarias);

  const total = [...porTabla.values()].reduce((suma, bloque) => suma + bloque.filas.length, 0);
  const resultados: ResultadoTabla[] = [];
  let procesadas = 0;

  for (const nombre of tablas) {
    const bloque = porTabla.get(nombre);
    const tabla = getTablaExport(nombre);
    if (!bloque || !tabla) continue;

    const preparadas = prepararBloque(tabla, bloque, empresaId);

    const pendientes: FilaImportacion[] = [];
    const resultadosFila: ResultadoFila[] = [];
    const clavesVistas = new Set<string>();
    const mapaClaves = mapas.get(nombre);

    for (const fila of preparadas) {
      const clavesPadres: Record<string, string> = {};

      if (fila.errores.length === 0) {
        for (const meta of tabla.columnas) {
          if (!meta.fk) continue;
          const bruto = fila.valores[meta.key];
          if (bruto === undefined || bruto === null || bruto === "") continue;

          const resolucion = resolverReferencia(mapas, meta.fk, bruto);
          if ("error" in resolucion) {
            fila.errores.push(`${meta.key}: ${resolucion.error}`);
          } else {
            clavesPadres[meta.key] = resolucion.clave;
            fila.valores[meta.key] = resolucion.id;
          }
        }
      }

      if (fila.errores.length === 0 && (tabla.claveNatural?.length ?? 0) > 0) {
        fila.clave = componerClave(tabla, fila.valores, clavesPadres);
        const claveNormalizada = normalizarClave(fila.clave);
        if (claveNormalizada) {
          const repetida =
            clavesVistas.has(claveNormalizada) ||
            mapaClaves?.compuestas.has(claveNormalizada) === true;
          if (repetida) {
            resultadosFila.push({
              numero: fila.numero,
              resumen: fila.resumen,
              estado: "existente",
              mensaje: "Ya existía en la base de datos (misma clave): se omite",
            });
            continue;
          }
          clavesVistas.add(claveNormalizada);
        }
      }

      if (fila.errores.length > 0) {
        resultadosFila.push({
          numero: fila.numero,
          resumen: fila.resumen,
          estado: "error",
          mensaje: fila.errores.join(" · "),
        });
        continue;
      }

      pendientes.push(fila);
    }

    const base = resultadosFila.length;
    onProgreso(procesadas + base, total);

    const insertadas = await insertarFilas(nombre, pendientes, (hechas) =>
      onProgreso(procesadas + base + hechas, total),
    );
    resultadosFila.push(...insertadas);

    const nuevas = insertadas.filter((r) => r.estado === "ok").length;
    // Se refresca el índice para que las tablas hijas encuentren estas filas.
    if (nuevas > 0) await refrescarMapa(mapas, nombre);

    resultadosFila.sort((a, b) => a.numero - b.numero);
    resultados.push({
      tabla: nombre,
      hoja: bloque.hoja,
      filas: preparadas.length,
      insertadas: nuevas,
      existentes: resultadosFila.filter((r) => r.estado === "existente").length,
      errores: resultadosFila.filter((r) => r.estado === "error").length,
      resultados: resultadosFila,
    });

    procesadas += preparadas.length;
    onProgreso(procesadas, total);
  }

  return resultados;
}
