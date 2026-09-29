import { supabase } from "@/infrastructure/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ColumnaExport, TablaExport } from "./exportTableCatalog";
import type { ColumnaArchivo } from "./leerArchivoImportacion";

/** Fila del archivo ya normalizada y validada contra la tabla destino. */
export interface FilaImportacion {
  /** Número de fila de datos en el archivo (1 = primera fila bajo la cabecera). */
  numero: number;
  /** Valores listos para `insert` (columna BD -> valor). */
  valores: Record<string, unknown>;
  /** Extracto de la fila para reconocerla en la tabla de resultados. */
  resumen: string;
  errores: string[];
}

export interface ResultadoFila {
  numero: number;
  resumen: string;
  estado: "ok" | "error";
  mensaje: string;
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
