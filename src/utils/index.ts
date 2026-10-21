export { formatCurrency } from "./currency/formatCurrency";
export { formatDate, formatDateOnly } from "./dates/formatDate";
export {
  RANGO_SIN_FILTRO,
  rangoDelPreset,
  dentroDelRango,
  diaEnEmpresa,
} from "./dates/rangoFechas";
export type { RangoFechas, PresetRango } from "./dates/rangoFechas";
export { formatNumber } from "./numbers/formatNumber";
export { capitalize } from "./strings/capitalize";
export { passwordDeEmail } from "./strings/passwordDeEmail";
export { isValidEmail } from "./validation/isValidEmail";
export { generateId } from "./general/generateId";
export { debounce } from "./general/debounce";
export { descargarArchivo } from "./general/descargarArchivo";
export {
  calcularFinanciamiento,
  validarFinanciamiento,
  RANGOS_FINANCIAMIENTO,
} from "./financiamiento/calcularFinanciamiento";
export type {
  EntradaFinanciamiento,
  ResultadoFinanciamiento,
} from "./financiamiento/calcularFinanciamiento";
export { compararNumeroLote } from "./lotes/compararNumeroLote";
export { etiquetaNumeroLote } from "./lotes/etiquetaNumeroLote";
export { detectarLoteEnNotas } from "./lotes/detectarLoteEnNotas";
export { esRolVendedor } from "./roles/esRolVendedor";
