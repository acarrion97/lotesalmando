/**
 * El catálogo de roles es editable por empresa (tabla `roles`), así que el rol
 * Vendedor se reconoce por su nombre normalizado y no por un id fijo.
 */
export function esRolVendedor(nombreRol: string | null | undefined): boolean {
  return (nombreRol ?? "").trim().toLowerCase() === "vendedor";
}
