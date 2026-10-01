export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Formatea una fecha "YYYY-MM-DD" de la base de datos (columna DATE) sin
 * pasarla por `new Date()`: eso la interpretaría como UTC medianoche y en
 * Ecuador (UTC-5) mostraría un día antes.
 */
export function formatDateOnly(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(anio, mes - 1, dia));
}
