export function normalizarIdentificacion(valor: string): string {
  return valor.trim().replace(/[\s.-]+/g, "").toUpperCase();
}
